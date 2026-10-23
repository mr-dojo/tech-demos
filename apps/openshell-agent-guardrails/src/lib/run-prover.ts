import { spawnSync } from "node:child_process"
import { isPinnedProverVersion, readProverReport } from "@/lib/prover"
import { recordedReports, type ProverBundle } from "@/lib/recordings"

const CHECKS = [
  ["baseline", "policies/baseline.yaml"],
  ["proposal", "policies/proposal.yaml"],
  ["credentialBinding", "policies/credential-binding.yaml"],
] as const

export type { ProverBundle }

export type LiveProverResult =
  | { live: true; version: "0.1.5"; reports: ProverBundle }
  | { live: false; reason: string; reports: ProverBundle }

export function runPinnedProver(root = process.cwd()): LiveProverResult {
  const recorded = recordedReports(root)
  const bin = process.env.OPENSHELL_PROVER ?? "openshell-prover"
  const version = spawnSync(/* turbopackIgnore: true */ bin, ["--version"], { encoding: "utf8", cwd: root })
  if (!isPinnedProverVersion(version.stdout ?? "")) {
    const printed = (version.stdout ?? "").trim() || (version.stderr ?? "").trim()
    return {
      live: false,
      reason: printed
        ? `Local binary printed ${JSON.stringify(printed)}. Showing the recorded openshell-prover 0.1.5 stdout.`
        : "openshell-prover 0.1.5 is not on PATH. Showing the recorded stdout.",
      reports: recorded,
    }
  }

  const reports = {} as ProverBundle
  for (const [key, file] of CHECKS) {
    const result = spawnSync(/* turbopackIgnore: true */
      bin,
      ["check", file, "--boundary", "policies/boundary.yaml", "--output", "json"],
      { cwd: root, encoding: "utf8", timeout: 20_000 },
    )
    try {
      reports[key] = readProverReport(JSON.parse(result.stdout ?? ""))
    } catch {
      return {
        live: false,
        reason: "The local binary did not return a 0.1.5 boundary report. Showing the recording.",
        reports: recorded,
      }
    }
  }
  return { live: true, version: "0.1.5", reports }
}
