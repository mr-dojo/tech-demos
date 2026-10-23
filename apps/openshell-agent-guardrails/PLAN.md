# PLAN — apps/openshell-agent-guardrails

> Demo of **NVIDIA OpenShell** (https://github.com/NVIDIA/OpenShell, Apache-2.0).
> Rust sandbox runtime. CLI and `openshell-prover` ship as release binaries. The Python SDK is the PyPI package `openshell` and does not install the CLI. Agent skills live in the repo (`npx skills add NVIDIA/OpenShell`) and, when policy advisor is on, inside the sandbox at `/etc/openshell/skills/policy-advisor/SKILL.md`.
>
> Themed as **Voltline PC**, the fictional computer-electronics retailer from `apps/openui-genui`. One store-ops agent, one sandbox, one task: reprice GPUs from a supplier feed. Not a real store.

## Goal (one sentence)

A single-user console where a Voltline operator watches a sandboxed repricing agent’s file, network, and credential activity as cards, and approves or denies the one policy change the prover flags.

## What OpenShell actually does (researched before this design)

Checked against the v0.1.5 docs (https://docs.nvidia.com/openshell/latest/) and the **v0.1.5** release binaries on 23 Oct 2026. `openshell-prover --version` prints `openshell-prover 0.1.5`. `openshell --version` prints `openshell 0.1.5`. Do not invent flags or log lines.

### Install and pins

- Release tag **`v0.1.5`** (20 Oct 2026). Installer: `curl -LsSf https://raw.githubusercontent.com/NVIDIA/OpenShell/main/install.sh | OPENSHELL_VERSION=v0.1.5 sh`.
- Standalone prover used for the recording: GitHub release asset `openshell-prover-x86_64-unknown-linux-musl.tar.gz`, checksum matched `openshell-prover-checksums-sha256.txt`.
- CLI tarball `openshell-x86_64-unknown-linux-musl.tar.gz` was unpacked only to read `--help`. It was not left on `PATH` for `bun run dev`.
- Python SDK: **`openshell==0.1.5`** on PyPI, `Requires-Python: >=3.11`. `uv add openshell` / `pip install openshell==0.1.5`. The wheel does not install the CLI. `openshell.Sandbox(workspace="default")` talks to a gateway. This demo does not import it.
- Rust: the prover binary is the release build. This app does not compile the crate, so there is no rustc pin. `openshell-prover` crate README (tag v0.1.5) documents the containment API and the separate proposal-risk queries.

### Policy YAML (`version: 1`)

Top level: `version`, `filesystem_policy` (static), `landlock` (static), `process` (static), `network_policies` (dynamic), `network_middlewares` (dynamic). Filesystem, Landlock, and process lock in at sandbox create. Network rules hot-reload via `openshell policy update` / `policy set`.

Filesystem: `include_workdir`, `read_only`, `read_write`. Paths must be absolute, no `..`. Unlisted paths are inaccessible. Landlock enforces that in the kernel (`compatibility: best_effort` default, or `hard_requirement`). Process: `run_as_user` / `run_as_group` must be `sandbox` or a UID/GID from 1 through 4294967294. `0` is rejected.

A network entry maps a name to `endpoints` plus `binaries`. REST endpoints use `protocol: rest`, `enforcement: enforce|audit`, and either `access: read-only|read-write|full` or `rules[].allow.{method,path}`. A network allow does **not** send provider credentials. Credentials go only to hosts on the provider profile or an explicit `credential_binding`.

Create: `openshell sandbox create --name <name> --policy ./policy.yaml`. Effective policy: `openshell sandbox get <name> --policy-only`.

### Two different prover checks

1. **Boundary check** — `openshell-prover check <candidate> --boundary <file> [--output text|json] [--timeout 10s]`. No gateway. Compares a candidate to an operator boundary. Exit codes from the v0.1.5 docs: `within_boundary` 0, `exceeds_boundary` 1, `error` 2, `unsupported` 3, `inconclusive` 3. Only `within_boundary` passes. JSON fields observed from the 0.1.5 binary: `schema_version`, `prover_version`, `check` (`"boundary"`), `coverage.domains`, `result`, `exit_code`, `inputs`, `counterexample`, `reason_code`, `reason`. Coverage domains: `filesystem`, `network_l4`, `network_rest`, `process`, `landlock`. The prover does not resolve hostnames. A network counterexample can still carry a `destination_ip`; that value is a solver witness, not a DNS answer.
2. **Proposal risk check** — runs inside the gateway when policy advisor (or a mechanistic draft) proposes a network rule. It is **not** `openshell policy prove` in v0.1.5: that subcommand is unrecognized. Categories, with no severity grade: `link_local_reach`, `l7_bypass_credentialed`, `credential_reach_expansion` (new host where a provider credential is in scope), `capability_expansion` (new HTTP method on an already credentialed host). The gateway stores a plain string, `prover: no new findings` or `prover: N new finding(s)` plus shorthand. This demo did not run that check.

Recorded on 23 Oct 2026 with `openshell-prover 0.1.5` (stdout kept verbatim under `recordings/`):

- Baseline candidate (read catalog, write proposals, GET `feed.northspan-supply.test:443`) → `within_boundary`, exit 0.
- Proposal that also allows `POST https://prices.voltline.test/v1/gpu-prices` via `/usr/bin/curl` → `exceeds_boundary`, exit 1. Counterexample domain `network`, host `prices.voltline.test`, port 443, protocol `rest`, method `POST`, path `/v1/gpu-prices`, `destination_ip` `8.8.8.8` (solver witness).
- Same new host plus `credential_binding.provider: voltline-prices` → `unsupported`, exit 3, `reason_code` `unsupported_policy_shape`, reason `candidate policy rule 'store_prices' uses authority outside the initial model`. Credential authority is outside the boundary model. Treat it as a failed check, not as a `credential_reach_expansion` finding.
- A candidate that writes `/opt/voltline/catalog` while the boundary only writes `/tmp` and `/opt/voltline/proposals` → `unsupported`, `reason_code` `unresolved_filesystem_path`. Different filesystem paths are not compared by string prefix, because a symlink could escape. Not used as the approval card.

### Policy advisor (docs, not executed)

Off by default. `openshell settings set <sandbox> --key agent_policy_proposals_enabled --value true`. Agent API at `http://policy.local` (`GET /v1/policy/current`, `GET /v1/denials`, `POST /v1/proposals`, `GET /v1/proposals/{id}/wait`). Humans review with `openshell rule get <sandbox> --status pending`, `rule approve --chunk-id`, `rule reject --chunk-id --reason`. Agents can propose network endpoints and binaries. They cannot propose `protocol: tcp`, `tls: skip`, or credential settings. Default approval mode is `manual`.

### Logs

`openshell logs <sandbox> --source sandbox` streams shorthand. Documented shapes include `NET:OPEN [INFO] ALLOWED /usr/bin/curl(58) -> api.github.com:443 [policy:github_api engine:opa]`, `HTTP:GET [INFO] ALLOWED GET https://api.github.com/zen`, and `NET:OPEN [MED] DENIED ... [reason:no matching policy]`. `CONFIG:*` lines cover policy load and proposal review. **File System Activity is not emitted in v0.1.5.** Issue #4270 was still open on 22 Oct 2026: after Landlock `restrict_self()`, a denied open returns `EACCES` to the workload and the supervisor logs nothing. Do not invent `FILE:` lines and present them as OpenShell output.

### What this environment could run

`openshell-prover 0.1.5` ran. Docker and Podman are not installed. `/dev/kvm` exists; the MicroVM runtime and gateway were not installed. The user process has no effective capabilities, and there is no gateway at `127.0.0.1:17670`. No sandbox was created, so there is no captured `openshell logs` stream and no proposal-risk string. The event feed is **sample data**, labeled in the UI. The three prover JSON files are **real stdout**.

## MVP scope (single user)

**In**

- One page. Voltline wordmark, amber mark, neutral shadcn chrome. One agent (`store-ops`), one sandbox name (`voltline-reprice`).
- A replay that reveals cards over time: network allow and deny, a file read and a file denial, and a credential note. Each card says whether it is sample data or a recorded prover result. File cards say they are workload outcomes, not OCSF events.
- When the agent proposes `POST prices.voltline.test`, a policy-diff card shows the YAML change and the recorded `exceeds_boundary` counterexample, plus the recorded `unsupported` result for a credential-binding shape. Approve and Deny buttons. Approve continues the replay and shows the repricing result. Deny stops before publish.
- A timeline of actions the policy already grants, and a result view: GPU cards and a bar chart of dollar deltas. Out-of-stock GTX 1070 is skipped. Margin floor is 8%.
- `GET /api/trace` and `POST /api/prover` bind for localhost only (`next dev --hostname 127.0.0.1`). `POST /api/prover` re-runs `openshell-prover` only when the binary on `PATH` (or `OPENSHELL_PROVER`) prints version `0.1.5` and only against the committed policy files. Otherwise it returns the recording and says so.
- `bun install && bun run dev` needs no Docker, no gateway, and no API key.

**Out (explicitly)**

- A real gateway, sandbox, provider credential, or live `openshell logs` stream inside `bun run dev`.
- Inventing `credential_reach_expansion` / `FILE:` / `openshell logs` lines and labeling them recorded.
- Multiple agents, multiple sandboxes, policy advisor auto-approval, Kubernetes, or a hosted deployment.
- Editing prices in a real catalog. Voltline figures are sample data copied in spirit from `apps/openui-genui`.
- Python SDK calls. The pin is documented; the package is not installed.

## Vertical-slice tasks (each ends in something visible or working)

1. **Scaffold boots** — `apps/openshell-agent-guardrails/` from `bunx create-next-app@latest` with `--skip-install`. `bunfig.toml` sets `minimumReleaseAge = 259200` before the first `bun install`. `bun run dev` serves a page on `127.0.0.1`.
2. **shadcn ready** — neutral base, CSS variables. The CLI has no preset named "minimalist"; use the neutral CSS-variable init (style `base-nova`). Components only as a slice needs them.
3. **Recording** — committed prover JSON from the three real `openshell-prover 0.1.5` checks, next to the policy files that were checked.
4. **Feed** — cards stream. Sample cards are badged Sample. The proposal card shows the recorded prover JSON.
5. **Decision** — Approve publishes the repricing chart. Deny withholds it. The timeline lists granted actions either way.
6. **Polish** — README states the provenance, the localhost limit, and that auth and rate limiting are required before hosting. Screenshot and screen recording on the PR.

## Stack (one-line rationale each)

- **Bun** (runtime + package manager): monorepo standard; scripts and `bun test`.
- **Next.js via `bunx create-next-app@latest --ts --tailwind --eslint --app --src-dir --use-bun --skip-install --yes --disable-git`**: official scaffold. The console needs a local route that can shell out to `openshell-prover`; a static Vite page would not. The scaffolder wrote `next@16.4.3`, which `minimumReleaseAge` rejected on 23 Oct 2026. The app is pinned to `next@16.4.2` and `eslint-config-next@16.4.2` (published 15 Oct 2026). The age check was not lowered.
- **`bunfig.toml` in `apps/openshell-agent-guardrails/`**, written before the first `bun install`, with `[install] minimumReleaseAge = 259200`. The repo root already has the same file. Do not lower the age to force a newer release.
- **Tailwind v4**: what current `create-next-app` installs.
- **shadcn/ui** (style `base-nova`, base color neutral, CSS variables): the CLI has no preset named "minimalist". Nova is the neutral default. Components on demand: button, card, badge, chart, separator, scroll-area.
- **`clsx` + `tailwind-merge`**: shadcn’s `cn` helper. Do not add a package named `cn`.
- **recharts through the shadcn chart**: the price-delta bars, instead of a hand-rolled SVG chart.
- **`openshell-prover` 0.1.5**: the official boundary checker. Optional at dev time. The committed JSON is the fallback. Python SDK **`openshell==0.1.5`** is the matching pin and is not installed.

## Component / service layout

```
apps/openshell-agent-guardrails/
├── bunfig.toml
├── PLAN.md
├── README.md
├── policies/                         # inputs to the recorded prover run
│   ├── boundary.yaml
│   ├── baseline.yaml
│   ├── proposal.yaml
│   └── credential-binding.yaml
├── recordings/                       # verbatim openshell-prover --output json
│   ├── baseline.json
│   ├── proposal.json
│   ├── credential-binding.json
│   └── meta.json
├── scripts/record-prover.ts          # re-runs the binary when it is installed
├── src/
│   ├── data/
│   │   ├── gpus.ts                   # Voltline shelf prices + sample supplier costs
│   │   └── trace.ts                  # sample feed + pointers at the recordings
│   ├── lib/
│   │   ├── reprice.ts
│   │   ├── reprice.test.ts
│   │   ├── prover.ts
│   │   ├── prover.test.ts
│   │   ├── replay.ts
│   │   ├── replay.test.ts
│   │   ├── local-request.ts
│   │   ├── local-request.test.ts
│   │   └── utils.ts
│   ├── app/
│   │   ├── api/trace/route.ts
│   │   ├── api/prover/route.ts
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── globals.css
│   └── components/
│       ├── ui/
│       ├── guardrail-console.tsx
│       ├── event-card.tsx
│       ├── policy-diff.tsx
│       ├── grant-timeline.tsx
│       └── reprice-result.tsx
└── .gitignore
```

## Env vars / API keys

- None for `bun install` or `bun run dev`.
- `OPENSHELL_PROVER`: optional path to an `openshell-prover` binary. `POST /api/prover` uses it only when `--version` prints `0.1.5`.
- No NVIDIA key, no provider token, no gateway URL.

## How to run

```bash
cd apps/openshell-agent-guardrails
bun install && bun run dev
```

The dev server listens on `127.0.0.1:3000`. Re-record the prover JSON (does not run on `dev`):

```bash
# binary from the v0.1.5 release asset, version string must be 0.1.5
bun run record
```

## Minimal tests and checks

- `bun test`:
  - Reprice: an under-margin GPU is raised to the 8% floor; a wide gap is cut and stays on or above the floor; an out-of-stock GPU is skipped; a denied decision publishes nothing.
  - Prover: the committed proposal report is `exceeds_boundary` for `prices.voltline.test` `POST /v1/gpu-prices` and `prover_version` `0.1.5`; `within_boundary` does not need approval; `unsupported` does; the `8.8.8.8` witness is described as a solver witness.
  - Replay: events stop at the proposal; approve reveals the publish step; deny does not.
  - Local request: `localhost` and `127.0.0.1` pass; another host or `X-Forwarded-For` fails.
- `bun run typecheck` and `bun run lint`.
- Critical logic only. No pixel tests. No test that requires the prover binary.

## Validation / definition of done

- `bun install && bun run dev` works from a clean clone with no Docker and no key.
- The feed, the policy-diff card with Approve and Deny, the timeline, and the repricing chart are visible.
- Sample cards are labeled sample. Prover cards show the recorded 0.1.5 JSON.
- Tests, typecheck, lint, and build pass.
- The PR includes at least one screenshot and one video of the running app, and says the sandbox was not run.

## Deferred (later, not MVP)

- A gateway plus Docker 28 or Podman 5, a real sandbox, and a captured `openshell logs` transcript in place of the sample feed.
- The gateway proposal-risk check (`credential_reach_expansion` and the other three categories) once `openshell rule get` can run.
- Policy advisor inside the sandbox (`policy.local`).
- Filesystem OCSF events, if upstream ships issue #4270.
- Auth and rate limiting, so the routes could be hosted. They are localhost-only until then.

## References

- Repo: https://github.com/NVIDIA/OpenShell (Apache-2.0), release **v0.1.5**
- Docs: https://docs.nvidia.com/openshell/latest/ — installation, policy schema, network rules, policy advisor, policy prover, logging
- Prover crate: https://github.com/NVIDIA/OpenShell/blob/v0.1.5/crates/openshell-prover/README.md
- PyPI: https://pypi.org/project/openshell/0.1.5/
- File-event gap: https://github.com/NVIDIA/OpenShell/issues/4270
