# Voltline PC · OpenShell guardrails

A single-user console for a fictional Voltline PC store-ops agent. The agent reprices GPUs from a supplier feed inside an [NVIDIA OpenShell](https://github.com/NVIDIA/OpenShell) policy boundary (Apache-2.0). One agent, one sandbox.

Shelf prices follow the sample Voltline catalog. Supplier costs, the Northspan feed, and `prices.voltline.test` are made up. This is not a real retailer.

## Run

```bash
cd apps/openshell-agent-guardrails
bun install && bun run dev
```

The dev server listens on `127.0.0.1:3000`. No Docker, gateway, or API key is required.

`GET /api/trace` and `POST /api/prover` answer only loopback requests with no `Forwarded` or `X-Forwarded-For` header. They are not safe to expose. Add authentication and rate limiting before hosting them.

## What is real

`recordings/*.json` is verbatim stdout from **`openshell-prover` 0.1.5**:

```bash
openshell-prover check policies/baseline.yaml --boundary policies/boundary.yaml --output json
openshell-prover check policies/proposal.yaml --boundary policies/boundary.yaml --output json
openshell-prover check policies/credential-binding.yaml --boundary policies/boundary.yaml --output json
```

- Baseline → `within_boundary`
- Proposal (`POST prices.voltline.test:443 /v1/gpu-prices`) → `exceeds_boundary`
- The same host with `credential_binding` → `unsupported` / `unsupported_policy_shape`

`destination_ip` `8.8.8.8` is a solver witness. The boundary check does not resolve hostnames.

The activity cards are **sample data**. This environment had no Docker, Podman, or OpenShell gateway, so nothing was captured from `openshell logs`. OpenShell 0.1.5 also does not emit filesystem OCSF events (issue [#4270](https://github.com/NVIDIA/OpenShell/issues/4270)). File cards are labeled as workload outcomes. The gateway proposal-risk categories, including `credential_reach_expansion`, were not run. `openshell policy prove` is not a subcommand in 0.1.5.

Approve and Deny continue the replay only. They do not call `openshell rule approve`.

## Re-run the prover

Pin the binary to the v0.1.5 release. Any other version is ignored.

```bash
export OPENSHELL_PROVER=/path/to/openshell-prover   # optional if it is on PATH
bun run record
```

`POST /api/prover` runs the same three checks when the binary prints `openshell-prover 0.1.5`. Otherwise the page keeps the committed recording.

The matching Python SDK pin is `openshell==0.1.5` (Python >=3.11). It is not installed. The SDK talks to a gateway and does not include the CLI.

## Checks

```bash
bun test
bun run typecheck
bun run lint
bun run build
```
