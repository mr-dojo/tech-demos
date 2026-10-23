import { spawnSync } from "node:child_process"
import { writeFileSync } from "node:fs"
import { resolve } from "node:path"

const root = resolve(import.meta.dir, "..")
const bin = process.env.OPENSHELL_PROVER ?? "openshell-prover"
const version = spawnSync(bin, ["--version"], { encoding: "utf8" })
const printed = (version.stdout ?? "").trim()
if (printed !== "openshell-prover 0.1.5") {
  console.error(`openshell-prover 0.1.5 is required, got ${JSON.stringify(printed) || version.stderr}`)
  process.exit(1)
}

const checks = [
  ["baseline", "policies/baseline.yaml"],
  ["proposal", "policies/proposal.yaml"],
  ["credential-binding", "policies/credential-binding.yaml"],
] as const

for (const [name, file] of checks) {
  const result = spawnSync(
    bin,
    ["check", file, "--boundary", "policies/boundary.yaml", "--output", "json"],
    { cwd: root, encoding: "utf8" },
  )
  const stdout = result.stdout ?? ""
  if (!stdout.trim()) {
    console.error(name, result.stderr)
    process.exit(1)
  }
  writeFileSync(resolve(root, "recordings", `${name}.json`), stdout.endsWith("\n") ? stdout : `${stdout}\n`)
  console.log(`${name} exit ${result.status}`)
}
