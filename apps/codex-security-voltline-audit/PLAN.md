# PLAN — apps/codex-security-voltline-audit

> Demo of **OpenAI Codex Security** (https://github.com/openai/codex-security, Apache-2.0).
> npm package **`@openai/codex-security`**. CLI (`cs` / `codex-security`) and TypeScript SDK that scan a repository, selected paths, or a Git diff for vulnerabilities, validate findings, write patches, verify fixes, and export SARIF, JSON, or CSV.
>
> Themed as **Voltline PC**, the fictional computer-electronics retailer from the other demos. This is a security desk over a deliberately vulnerable checkout-and-returns API fixture. Not a real store, and the fixture is never deployed as a server.
>
> Researched on 13 Nov 2026 against the public README, the CLI and SDK guides, and the **0.9.1** typings (the newest release that already satisfies this repo's three-day install age check). Do not invent flags, methods, or JSON fields.

## Goal (one sentence)

A single-user Voltline security desk where a coworker can walk a recorded Codex Security scan of a planted checkout-and-returns API: a severity chart, a card per finding with source evidence, a before/after patch diff, and a “fixed & verified” timeline — all on a static GitHub Pages page with no API key.

## What Codex Security actually does (researched before this design)

Checked on 13 Nov 2026 against:

- https://github.com/openai/codex-security/blob/main/README.md
- https://github.com/openai/codex-security/blob/main/sdk/typescript/README.md
- https://github.com/openai/codex-security/blob/main/sdk/typescript/docs/cli.md
- https://github.com/openai/codex-security/blob/main/sdk/typescript/docs/sdk.md
- https://learn.chatgpt.com/docs/security/cli and https://learn.chatgpt.com/docs/security/sdk
- npm `@openai/codex-security`: latest **0.10.0** (published 12 Nov 2026 02:18 UTC). Typings for the age-eligible pin **0.9.1** (published 10 Nov 2026 01:07 UTC): `dist/api.d.ts`, `dist/models.d.ts`, `dist/result.d.ts`, `dist/remediation.d.ts`, `dist/artifact-export.d.ts`.

Do not invent APIs. Before 1.0, minor releases may change the public API (package README). Recheck the pinned version's typings at build time.

### Install and runtime

Requires **Node.js 22.13.0+ within 22.x, or Node.js 24.x or 26.x**, and **Python 3.10+** (Python 3.10 also needs `tomli`). Official docs do not list Bun as a supported scan runtime. The Vite desk uses Bun; any live or recorded scan must be invoked with the official Node CLI, not `bunx`.

Install the CLI globally:

```bash
npm install --global @openai/codex-security
cs --version          # or: codex-security --version
```

`cs` and `codex-security` are the same CLI (`bin/codex-security.mjs`). If `cs` conflicts, use `codex-security`. To skip a global install, or if npm reports `EEXIST`, use `npx @openai/codex-security` in place of `cs`.

Install the TypeScript SDK in a Node project (devDependency of this app at most — never a Vite client import):

```bash
npm install @openai/codex-security
```

### Pin and the three-day age check

This monorepo requires `bunfig.toml` with `[install] minimumReleaseAge = 259200` before the first `bun install`, and forbids lowering that check. As of 13 Nov 2026 18:00 ET, **0.10.0 is too new** (eligible only after 15 Nov 2026 02:18 UTC). The newest eligible release is **0.9.1**.

At build time, pin the newest `@openai/codex-security` that already satisfies the age check. If 0.10.0 has aged in by then, it may be used. Do not lower `minimumReleaseAge` to take a newer release.

### Authentication

Interactive / local sign-in:

```bash
cs login
# or, with a local install: npx @openai/codex-security login
# save a key: printenv OPENAI_API_KEY | cs login --with-api-key
```

For CI or a headless record script, set **`OPENAI_API_KEY` or `CODEX_API_KEY`** in the scan process's environment. `OPENAI_API_KEY` takes precedence. Environment keys apply to the current command and do not replace a saved login. Noninteractive commands prefer `OPENAI_API_KEY`, then `CODEX_API_KEY`, then stored credentials. Force a key with `--auth api-key` (CLI) or `auth: "api-key"` (SDK `run()`, `validate()`, `preflight()`, and `patch()`). `--auth chatgpt` ignores environment keys.

Some cybersecurity requests and protected findings require [Trusted Access for Cyber](https://chatgpt.com/cyber). This demo does not depend on Daybreak or a Cyber access program.

**Never put a key in client code, `VITE_*` variables, the Pages build, or committed files.** The static desk reads committed recordings only.

### Scan, export, validate, patch, verify

From the directory being reviewed:

```bash
# Standard scan of the fixture (default mode). Results go to a new/empty
# directory outside the scanned tree and its Git worktree.
npx @openai/codex-security@0.9.1 scan . --auth api-key \
  --output-dir /path/outside/fixture/scan-results

# Optional cost cap (in-flight requests can still exceed it).
npx @openai/codex-security@0.9.1 scan . --auth api-key --max-cost 5 \
  --output-dir /path/outside/fixture/scan-results

# Export does not need a key or a rescan. JSON is the sealed findings document.
npx @openai/codex-security@0.9.1 export /path/outside/fixture/scan-results \
  --export-format json --output findings.json
npx @openai/codex-security@0.9.1 export /path/outside/fixture/scan-results \
  --export-format sarif --output results.sarif

# Patch saved findings (writes a disposable workspace; does not commit or open a PR).
npx @openai/codex-security@0.9.1 patch --scan SCAN_ID --severity high --json --auth api-key

# Verify an existing fix in a read-only sandbox (CLI only in 0.9.1; no SDK method).
npx @openai/codex-security@0.9.1 verify-fix --scan SCAN_ID --json --auth api-key
# or, source-only:  --verification-mode static
```

A completed scan exits `0` even when it finds vulnerabilities; `--fail-on-severity high` exits `1` for high or critical findings; execution failures exit `2`.

`scan --mock` produces 12 synthetic findings with **fictional paths and snippets** and needs no key. Use it only to inspect the on-disk layout during development. **Do not ship a mock scan as the coworker demo** — the cards must point at the Voltline fixture.

### TypeScript SDK surface (0.9.1 typings; used only by the local record script)

```ts
import { CodexSecurity, exportArtifact } from "@openai/codex-security";

const security = new CodexSecurity();
try {
  const result = await security.run("/path/to/fixture", {
    auth: "api-key",
    outputDir: "/path/outside/fixture/scan-results",
    maxCostUsd: 5,
  });
  console.log(result.reportPath);
  console.log(result.findings.findings);
  console.log(result.hasFindingsAtOrAbove("high"));

  const assessment = await security.validate({
    repositoryPath: "/path/to/fixture",
    finding: result.findings.findings[0],
  });
  // assessment.disposition: "reportable" | "suppressed" | "not_applicable" | "deferred"

  const patched = await security.patch({
    repositoryPath: "/path/to/disposable/copy",
    finding: result.findings.findings[0],
    auth: "api-key",
    verificationMode: "static", // optional; default is "standard"
  });
  // patched.status: "verified" | "no_change" | "blocked" | "failed"
} finally {
  await security.close();
}

await exportArtifact({
  source: { directory: "/path/outside/fixture/scan-results" },
  artifact: "findings",
  format: "json",
  output: "/path/to/findings.json",
});
```

`CodexSecurity` in 0.9.1 exposes `run`, `validate`, `patch`, `preflight`, `preflightPolicy`, `generatePolicy`, `previewPolicy`, and `close`. **There is no `verifyFix()` method.** Existing-fix verification is the CLI command `verify-fix`. `patch()` already returns a verification outcome for the patch it just wrote (`verificationReport` on `verified` / `no_change`).

Other `run()` options documented in the SDK guide and typings, not needed for MVP: `target` (paths or `DiffTarget`), `mode: "standard" | "deep"`, `maxTimeMinutes`, `scanPrompt`, callbacks (`onLifecycle`, `onCost`, …). Deep scans, bulk scans, Cloud publication, Linear, owner suggestions, and policy generation are out of scope.

### Output schema the desk must consume

A completed scan writes a sealed results directory. The files the UI cares about:

| File | Document type | What the desk uses |
| --- | --- | --- |
| `findings.json` (or `export --export-format json`) | `documentType: "codex-security.findings"`, `schemaVersion: "1.0"` | Finding cards and the severity chart |
| `scan-manifest.json` | `documentType: "codex-security.scan-manifest"`, `schemaVersion: "1.0"` | Scan id, status, started/completed times, scope |
| `report.md` | Markdown report (`ScanResult.reportPath`) | Optional “open the report” drawer; not the primary UI |
| `exports/results.sarif` | SARIF 2.1.0 (optional; default export format) | Not rendered; may be committed for provenance |

Each finding in `findings.findings[]` (from `sdk/typescript/src/models.ts` / 0.9.1 `models.d.ts`) includes:

- `findingId`, `occurrenceId`, `ruleId`
- `title`, `summary`, `remediation`
- `severity.level`: `"critical" | "high" | "medium" | "low" | "informational"`
- `confidence.level`: `"high" | "medium" | "low"` plus `confidence.rationale`
- `taxonomy.category`, `taxonomy.cwe[]`
- `locations[]`: `{ path, startLine, endLine?, role? }` (at least one)
- `codeEvidence[]` (optional): `{ id, label, path, startLine, endLine?, language?, role?, code, explanation }` — this is the source snippet on the card
- `rootCause` (object with `summary` / `evidenceRefs`, or a string)
- `provenance.source`

JSON export **is** that sealed findings document (the exporter returns the saved `findings.json` bytes). Do not invent a simplified schema and call it a Codex Security export. If a real export is unavailable, the committed sample must still validate as `codex-security.findings` `schemaVersion: "1.0"` and say so in the UI.

Patch recordings, when produced by the tool, follow `FindingPatch`: `{ occurrenceId, status: "verified" | "no_change" | "blocked" | "failed", files: string[], verification?, reason? }`. CLI `verify-fix --json` results follow `FindingVerification`: `{ id, status: "fixed" | "still_vulnerable" | "inconclusive", evidence: string }`. Store those JSON documents next to unified diffs taken from the disposable patch workspace vs. the fixture.

## MVP scope (single user)

**In**

- One static Vite page. Voltline wordmark, amber mark, neutral shadcn chrome, a provenance banner that cannot be missed.
- A small, clearly marked **deliberately vulnerable** Voltline checkout-and-returns API under `fixture/` (TypeScript source plus a short `fixture/README.md`). Plant a handful of realistic issues (on the order of four to six), for example string-concat SQL on a returns lookup, a missing authorization check on a return record (IDOR), path traversal on a receipt download, a hardcoded secret, and an unvalidated refund amount. Comments and the fixture README must say **DELIBERATELY VULNERABLE — DO NOT DEPLOY**. There is no production start script and the Pages build must not listen on a port for this API.
- A severity overview **chart** (counts by `severity.level`), not a table.
- A **card** per finding: title, severity and confidence badges, summary, CWE if present, and the `codeEvidence` snippet (path + line range + code + explanation). Clicking a card opens the patch view.
- A **before/after diff** for the finding's patched files (unified diff, fixture source vs. patched copy).
- A **timeline** of desk actions with a “fixed & verified” badge when patch status is `verified` or `verify-fix` status is `fixed`. Other statuses (`blocked`, `failed`, `no_change`, `still_vulnerable`, `inconclusive`) get an honest badge, never a fake success.
- A **recorded sample** shipped in the repo so `bun run dev` and the Pages build work with no key:
  1. Prefer a real `scan` + `export --export-format json` of `fixture/`, plus real `patch` / `verify-fix` artifacts, produced by the official CLI or SDK with `OPENAI_API_KEY` or `CODEX_API_KEY`. Review the report for secrets before committing. Record package version, command lines, and date in `recordings/provenance.json`.
  2. If no key is available at build time, commit a **clearly labeled** sample `findings.json` that matches the real `codex-security.findings` `1.0` schema, with `locations` and `codeEvidence` pointing at the fixture, plus labeled sample diffs and patch/verification JSON in the same shapes (`FindingPatch` / `FindingVerification`). The banner must say “Sample matching the Codex Security schema — not a live tool run.”
- Optional live re-record: `bun run record` (Node CLI, local only) requires `OPENAI_API_KEY` or `CODEX_API_KEY` in the process environment, writes into a directory outside `fixture/`, and copies reviewed artifacts into `recordings/`. It never runs in the browser or during `vite build`.
- Pages base path `/tech-demos/codex-security-voltline-audit/` via `VITE_BASE_PATH`, same pattern as `apps/graphify-code-map` and `apps/openbot-exec-assistant`.
- `bun install && bun run dev` needs no API key.

**Out (explicitly)**

- Importing `@openai/codex-security` into the Vite client, or exposing any key with a `VITE_*` variable.
- A hosted live-scan API, a Pages function, or a proxy that takes a key from the browser.
- Deploying or even booting the fixture as a network server in `dev`, `preview`, or CI.
- Deep scans, `scan --mock` as the shipped recording, Cloud / Linear publication, owner suggestions, `SECURITY.md` generation, ServiceNow export, custom validation prompts, `--create-pr`, or Daybreak / Cyber access programs.
- Auth, multiple users, or editing findings in the browser.
- Touching files outside `apps/codex-security-voltline-audit/` in the build PR (see follow-up below for Pages workflow).

## Vertical-slice tasks (each ends in something visible or working)

1. **Scaffold boots** — `apps/codex-security-voltline-audit/` from `bunx create-vite@latest --template react-ts --no-immediate --no-interactive`. Write `bunfig.toml` with `[install] minimumReleaseAge = 259200` **before** the first `bun install`. `vite.config.ts` reads `process.env.VITE_BASE_PATH || "/"`. `bun run dev` serves a page on `127.0.0.1`.
2. **shadcn ready** — neutral base, CSS variables. The CLI has no preset named “minimalist”; use style `base-nova`. Add components only as a slice needs them.
3. **Fixture** — the Voltline checkout-and-returns API source is on disk, labeled deliberately vulnerable, and is not started as a server.
4. **Recording** — either a real CLI/SDK scan+export+patch (and `verify-fix` when a key is present) committed under `recordings/`, or a schema-accurate labeled sample. `provenance.json` states which one, the package version, and the date.
5. **Desk** — severity chart, finding cards with `codeEvidence`, before/after diff, and the verification timeline all render from that recording. The banner names the provenance.
6. **Polish** — README with install/run, the key rule, the fixture warning, and how to re-record. Screenshot and screen recording on the PR. The page should look polished enough to show coworkers (cards, chart, and timeline — not a table of findings).

## Stack (one-line rationale each)

- **Bun** (runtime + package manager for the desk): monorepo standard; scripts and `bun test`.
- **Vite + React + TypeScript via `bunx create-vite@latest --template react-ts --no-immediate --no-interactive`**: official scaffold; the Pages artifact has to be static.
- **`bunfig.toml` in this app**, written before the first `bun install`, with `[install] minimumReleaseAge = 259200`. The repo root already has the same file. Do not lower the age.
- **Tailwind v4**: what current shadcn installs on this Vite scaffold.
- **shadcn/ui** (style `base-nova`, base color neutral, CSS variables): the CLI has no preset named “minimalist”. Components on demand: button, card, badge, chart, scroll-area, separator, tabs.
- **recharts through the shadcn chart**: the severity overview, instead of a hand-rolled SVG or a table.
- **`@openai/codex-security` (age-eligible pin, 0.9.1 as of this plan)**: official CLI and SDK for the optional local `record` script only. Not a client dependency. Scans run under Node as the docs require.
- **A small syntax-highlighted diff view** (a prebuilt component or library, not a custom parser): the before/after patch pane.

## Component / service layout

```
apps/codex-security-voltline-audit/
├── bunfig.toml
├── PLAN.md
├── README.md
├── fixture/                         # deliberately vulnerable sample; never served
│   ├── README.md                    # DELIBERATELY VULNERABLE — DO NOT DEPLOY
│   └── src/                         # checkout + returns API source
├── recordings/
│   ├── provenance.json              # real-run vs schema-sample, version, date, commands
│   ├── findings.json                # sealed FindingsDocument (real export or labeled sample)
│   ├── scan-manifest.json           # if a real scan was sealed; omit or label if sample
│   ├── patches/                     # FindingPatch JSON + unified diffs per occurrence
│   └── verifications/               # FindingVerification JSON when verify-fix ran
├── scripts/record.ts                # Node CLI/SDK; requires OPENAI_API_KEY or CODEX_API_KEY
├── src/
│   ├── data/                        # re-exports recordings + provenance for the UI
│   ├── lib/
│   │   ├── findings.ts              # parse/validate FindingsDocument; severity rollup
│   │   ├── findings.test.ts
│   │   ├── patches.ts               # map occurrenceId → diff + patch/verify status
│   │   ├── patches.test.ts
│   │   ├── timeline.ts
│   │   └── timeline.test.ts
│   └── components/
│       ├── ui/
│       ├── security-desk.tsx
│       ├── severity-chart.tsx
│       ├── finding-card.tsx
│       ├── patch-diff.tsx
│       └── verification-timeline.tsx
└── .gitignore
```

## Env vars / API keys

- None required for `bun install`, `bun run dev`, `bun run build`, or the Pages artifact.
- `VITE_BASE_PATH` only for the Pages build (`/tech-demos/codex-security-voltline-audit/`).
- `OPENAI_API_KEY` or `CODEX_API_KEY`: optional, **local `bun run record` only**. Prefer `--auth api-key`. Never commit a key, never prefix it with `VITE_`.
- `CODEX_SECURITY_STATE_DIR`: optional private state directory for a record run; keep it outside `fixture/` and the app checkout if used.
- No ChatGPT login is required for the static desk.

## How to run

```bash
cd apps/codex-security-voltline-audit
bun install && bun run dev
```

Local desk: http://127.0.0.1:5173 . No key needed.

Pages-style preview:

```bash
VITE_BASE_PATH=/tech-demos/codex-security-voltline-audit/ bun run build
bun run preview
```

Optional re-record (Node 22.13+ or 24/26, Python 3.10+, and a key). Does not run on `dev` or `build`:

```bash
export OPENAI_API_KEY=...          # or CODEX_API_KEY
bun run record
```

Review `recordings/` for secrets in reports or snippets before committing.

## Minimal tests and checks

- `bun test`:
  - Findings parser accepts a `documentType: "codex-security.findings"` / `schemaVersion: "1.0"` document and rejects a malformed one.
  - Severity rollup counts match the committed recording's `severity.level` values, including zero counts for unused levels.
  - Each finding card source path in the recording exists under `fixture/` and the snippet's `startLine` is in range for that file.
  - Timeline: `verified` / `fixed` shows the “fixed & verified” badge; `blocked`, `failed`, `still_vulnerable`, and `inconclusive` do not.
  - `pageHref` / asset URLs prefix `import.meta.env.BASE_URL` without a double slash.
- `bun run typecheck` and `bun run lint`.
- Critical logic only. No test calls OpenAI. No pixel tests.

## Validation / definition of done

- `bun install && bun run dev` works from a clean clone with no API key.
- The chart, finding cards with evidence snippets, before/after diffs, and verification timeline are visible and use cards / a chart / a timeline rather than a findings table.
- The provenance banner tells the truth: a real Codex Security run, or a labeled schema sample.
- The fixture is marked deliberately vulnerable and is not served.
- Tests, typecheck, lint, and `VITE_BASE_PATH=/tech-demos/codex-security-voltline-audit/ bun run build` pass.
- The PR includes at least one screenshot and one video of the running app.
- The build PR stays inside `apps/codex-security-voltline-audit/` (plus `tracking/` if the builder moves the bookmark from `proposed` to `built`, which AGENTS.md allows). It does not merge itself and does not edit the Pages workflow.

## Follow-up (outside this folder; not the build PR)

GitHub Pages will not serve this demo until `.github/workflows/pages.yml` gains:

- a path trigger for `apps/codex-security-voltline-audit/**`
- `bun install --frozen-lockfile` and `bun run build` with `VITE_BASE_PATH: /tech-demos/codex-security-voltline-audit/`
- a copy of `dist/` to `site/codex-security-voltline-audit/`
- a link on the generated `site/index.html`

AGENTS.md keeps root workflow edits off demo PRs unless the change is explicitly about the monorepo skeleton. After merge, a short skeleton follow-up can add those lines so the live URL is https://mr-dojo.github.io/tech-demos/codex-security-voltline-audit/ . Until then, `bun run preview` with the same `VITE_BASE_PATH` is the local stand-in.

## Deferred (later, not MVP)

- A real scan recording if this plan's build had to ship a schema sample (re-run `bun run record` once a key is available, replace `recordings/`, relabel the banner).
- Upgrading the pin to 0.10.0 (or later) once it satisfies `minimumReleaseAge`, without lowering the check.
- Wiring the optional record script to `verify-fix` in `standard` mode (needs install/build tooling in the fixture) rather than `static`.
- A GitHub Action weekly scan of the fixture (needs a repository secret such as `CODEX_SECURITY_API_KEY`; see the official Action guide). Not for Pages.
- Deep scans, Cloud findings, or publishing to Linear.

## Blockers / planning-time limits

- This planning pass did **not** run Codex Security. No `OPENAI_API_KEY` or `CODEX_API_KEY` was used here. A real recorded scan therefore remains a build-time task: if the builder has a key, produce and review a real export; if not, ship the labeled schema sample and say so in the banner, README, and PR.
- Official scans need Node 22.13+ (or 24/26) and Python 3.10+ on the builder machine. Bun is not a documented scan runtime.
- The public Pages URL is blocked on the out-of-folder workflow follow-up above.

## References

- Repo: https://github.com/openai/codex-security (Apache-2.0)
- npm: https://www.npmjs.com/package/@openai/codex-security (pin 0.9.1 as of this plan; recheck age at build)
- CLI guide: https://github.com/openai/codex-security/blob/main/sdk/typescript/docs/cli.md and https://learn.chatgpt.com/docs/security/cli
- SDK guide: https://github.com/openai/codex-security/blob/main/sdk/typescript/docs/sdk.md and https://learn.chatgpt.com/docs/security/sdk
- Findings / manifest types: `sdk/typescript/src/models.ts` (`FindingsDocument`, `ScanManifest`)
- Patch / verify result types: 0.9.1 `dist/api.d.ts` (`PatchResult`), `dist/remediation.d.ts` (`FindingPatch`, `FindingVerification`)
- Export: `cs export --export-format json|csv|sarif` and `exportArtifact()`
