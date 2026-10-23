export const PINNED_PROVER_VERSION = "0.1.5"

export type ProverResult =
  | "within_boundary"
  | "exceeds_boundary"
  | "error"
  | "unsupported"
  | "inconclusive"

export type NetworkCounterexample = {
  domain: string
  binary: string | null
  ancestor_binary: string | null
  binary_identity_required: boolean
  host: string
  destination_ip: string
  trusted_gateway: boolean
  port: number
  protocol: string
  method: string
  path: string
}

export type ProverReport = {
  schema_version: number
  prover_version: string
  check: string
  coverage: { domains: string[] }
  result: ProverResult
  exit_code: number
  inputs: { candidate: string; boundary: string }
  counterexample: NetworkCounterexample | null
  reason_code: string | null
  reason: string | null
}

const RESULTS = new Set<ProverResult>([
  "within_boundary",
  "exceeds_boundary",
  "error",
  "unsupported",
  "inconclusive",
])

export function isPinnedProverVersion(stdout: string): boolean {
  return stdout.trim() === `openshell-prover ${PINNED_PROVER_VERSION}`
}

export function needsHumanApproval(report: ProverReport): boolean {
  return report.result !== "within_boundary"
}

export function readProverReport(value: unknown): ProverReport {
  if (!value || typeof value !== "object") {
    throw new Error("prover report is not an object")
  }
  const row = value as Record<string, unknown>
  if (!RESULTS.has(row.result as ProverResult)) {
    throw new Error("unexpected prover result")
  }
  if (row.prover_version !== PINNED_PROVER_VERSION) {
    throw new Error(`prover_version must be ${PINNED_PROVER_VERSION}`)
  }
  if (row.check !== "boundary") {
    throw new Error("only a boundary check is recorded")
  }
  const coverage = row.coverage as { domains?: unknown } | undefined
  if (!coverage || !Array.isArray(coverage.domains) || coverage.domains.length === 0) {
    throw new Error("coverage.domains is missing")
  }
  return value as ProverReport
}

export function counterexampleLine(report: ProverReport): string | null {
  const example = report.counterexample
  if (!example) return report.reason
  return `${example.method} ${example.host}:${example.port} ${example.path}`
}

/** The boundary check does not resolve DNS. destination_ip is a solver witness. */
export function solverWitnessNote(report: ProverReport): string | null {
  const ip = report.counterexample?.destination_ip
  if (!ip) return null
  return `destination_ip ${ip} is a solver witness. This boundary check does not resolve hostnames.`
}

export function proposedAddition(proposalYaml: string): string {
  const marker = "  store_prices:"
  const index = proposalYaml.indexOf(marker)
  if (index < 0) return proposalYaml.trim()
  return proposalYaml.slice(index).trim()
}
