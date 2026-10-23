export type FeedKind = "network" | "file" | "credential" | "process" | "policy"
export type FeedDecision = "allowed" | "blocked" | "flagged" | "info"
export type FeedSource = "sample" | "recorded"
export type FeedPhase = "before" | "proposal" | "after-approve" | "after-deny"

export type FeedEvent = {
  id: string
  kind: FeedKind
  decision: FeedDecision
  title: string
  detail: string
  source: FeedSource
  sourceNote: string
  phase: FeedPhase
}

/**
 * Sample cards illustrate a Voltline repricing task. They are not openshell logs.
 * The proposal card is the only recorded event; its prover JSON is loaded separately.
 */
export const FEED: FeedEvent[] = [
  {
    id: "sandbox-start",
    kind: "process",
    decision: "info",
    title: "Sandbox voltline-reprice",
    detail: "One agent, store-ops, starts on the baseline policy. It may read the GPU catalog, write /opt/voltline/proposals, and GET the Northspan supplier feed.",
    source: "sample",
    sourceNote: "Sample. No gateway was running, so this is not an openshell logs line.",
    phase: "before",
  },
  {
    id: "read-catalog",
    kind: "file",
    decision: "allowed",
    title: "Read catalog",
    detail: "Read /opt/voltline/catalog/gpus.json. That directory is on the baseline read_only list.",
    source: "sample",
    sourceNote: "Sample workload outcome. OpenShell 0.1.5 does not emit a File System Activity event for this open.",
    phase: "before",
  },
  {
    id: "get-feed",
    kind: "network",
    decision: "allowed",
    title: "GET supplier feed",
    detail: "curl GET https://feed.northspan-supply.test/v1/gpu-costs — host, port 443, and read-only REST are in the supplier-feed rule.",
    source: "sample",
    sourceNote: "Sample. Illustrated only. Not captured from openshell logs.",
    phase: "before",
  },
  {
    id: "read-secret",
    kind: "file",
    decision: "blocked",
    title: "Open price token file",
    detail: "Open /opt/voltline/secrets/price-token. The path is outside the filesystem policy, so the process would get EACCES from Landlock.",
    source: "sample",
    sourceNote: "Sample workload outcome. A denied open is not written to the supervisor log in v0.1.5.",
    phase: "before",
  },
  {
    id: "credential-scope",
    kind: "credential",
    decision: "blocked",
    title: "Store credential stays put",
    detail: "The agent cannot take the voltline-prices token to a new host. A network rule does not send provider credentials. Credential scope is the provider profile, or an explicit credential_binding.",
    source: "sample",
    sourceNote: "Sample. No AUTH event was captured. The recorded credential-binding check is on the policy card.",
    phase: "before",
  },
  {
    id: "post-denied",
    kind: "network",
    decision: "blocked",
    title: "POST prices blocked",
    detail: "curl POST https://prices.voltline.test/v1/gpu-prices has no matching network rule, so the connection stays denied.",
    source: "sample",
    sourceNote: "Sample. Illustrated only. Not captured from openshell logs.",
    phase: "before",
  },
  {
    id: "proposal",
    kind: "policy",
    decision: "flagged",
    title: "Policy change needs approval",
    detail: "The agent proposes a REST POST for /usr/bin/curl to prices.voltline.test:443 /v1/gpu-prices. The recorded boundary check does not pass.",
    source: "recorded",
    sourceNote: "Recorded openshell-prover 0.1.5 boundary check. Not a gateway proposal-risk string.",
    phase: "proposal",
  },
  {
    id: "rule-loaded",
    kind: "process",
    decision: "info",
    title: "Replay continues",
    detail: "Approve only continues this replay. It does not call openshell rule approve, and it does not load a rule into a sandbox.",
    source: "sample",
    sourceNote: "Sample continuation after a local decision.",
    phase: "after-approve",
  },
  {
    id: "post-allowed",
    kind: "network",
    decision: "allowed",
    title: "POST prices allowed in the replay",
    detail: "The replay treats the proposed POST as allowed and publishes the in-stock GPU suggestions.",
    source: "sample",
    sourceNote: "Sample. The pricing host was not actually reached.",
    phase: "after-approve",
  },
  {
    id: "write-proposals",
    kind: "file",
    decision: "allowed",
    title: "Write proposal file",
    detail: "Write /opt/voltline/proposals/gpu-prices.json. That directory is already on the baseline read_write list.",
    source: "sample",
    sourceNote: "Sample workload outcome. Not an OpenShell file event.",
    phase: "after-approve",
  },
  {
    id: "denied-stop",
    kind: "process",
    decision: "blocked",
    title: "Publish withheld",
    detail: "Deny stops the agent before the pricing POST. Shelf prices stay as they are. Nothing is written.",
    source: "sample",
    sourceNote: "Sample continuation after a local decision.",
    phase: "after-deny",
  },
]
