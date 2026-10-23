import { readFileSync } from "node:fs"
import path from "node:path"
import { readProverReport, type ProverReport } from "@/lib/prover"

export type ProverBundle = {
  baseline: ProverReport
  proposal: ProverReport
  credentialBinding: ProverReport
}

export function recordedReports(root = process.cwd()): ProverBundle {
  const read = (name: string) =>
    readProverReport(JSON.parse(readFileSync(path.join(root, "recordings", name), "utf8")))
  return {
    baseline: read("baseline.json"),
    proposal: read("proposal.json"),
    credentialBinding: read("credential-binding.json"),
  }
}

export function readPolicies(root = process.cwd()) {
  const read = (name: string) => readFileSync(path.join(root, "policies", name), "utf8")
  return {
    boundary: read("boundary.yaml"),
    baseline: read("baseline.yaml"),
    proposal: read("proposal.yaml"),
    credentialBinding: read("credential-binding.yaml"),
  }
}
