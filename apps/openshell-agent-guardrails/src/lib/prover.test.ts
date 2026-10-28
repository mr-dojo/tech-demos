import { readFileSync } from "node:fs"
import { describe, expect, test } from "bun:test"
import baselineJson from "../../recordings/baseline.json"
import credentialJson from "../../recordings/credential-binding.json"
import proposalJson from "../../recordings/proposal.json"
import {
  counterexampleLine,
  isPinnedProverVersion,
  needsHumanApproval,
  proposedAddition,
  readProverReport,
  solverWitnessNote,
} from "@/lib/prover"

describe("recorded openshell-prover 0.1.5 stdout", () => {
  const baseline = readProverReport(baselineJson)
  const proposal = readProverReport(proposalJson)
  const credential = readProverReport(credentialJson)

  test("baseline stays inside the operator boundary", () => {
    expect(baseline.result).toBe("within_boundary")
    expect(baseline.prover_version).toBe("0.1.5")
    expect(needsHumanApproval(baseline)).toBe(false)
  })

  test("the pricing POST exceeds the boundary", () => {
    expect(proposal.result).toBe("exceeds_boundary")
    expect(proposal.exit_code).toBe(1)
    expect(proposal.counterexample?.host).toBe("prices.voltline.test")
    expect(proposal.counterexample?.method).toBe("POST")
    expect(proposal.counterexample?.path).toBe("/v1/gpu-prices")
    expect(needsHumanApproval(proposal)).toBe(true)
    expect(counterexampleLine(proposal)).toBe("POST prices.voltline.test:443 /v1/gpu-prices")
  })

  test("the destination IP is described as a solver witness", () => {
    const note = solverWitnessNote(proposal)
    expect(note).toContain("8.8.8.8")
    expect(note).toContain("solver witness")
    expect(note?.toLowerCase()).not.toContain("resolved")
  })

  test("a credential binding is unsupported, which still needs approval", () => {
    expect(credential.result).toBe("unsupported")
    expect(credential.reason_code).toBe("unsupported_policy_shape")
    expect(credential.reason).toContain("outside the initial model")
    expect(needsHumanApproval(credential)).toBe(true)
  })
})

describe("prover helpers", () => {
  test("pins the version string the 0.1.5 binary prints", () => {
    expect(isPinnedProverVersion("openshell-prover 0.1.5\n")).toBe(true)
    expect(isPinnedProverVersion("openshell-prover 0.1.4")).toBe(false)
  })

  test("the proposal card shows the store_prices rule from the YAML", () => {
    const addition = proposedAddition(readFileSync(new URL("../../policies/proposal.yaml", import.meta.url), "utf8"))
    expect(addition.startsWith("store_prices:")).toBe(true)
    expect(addition).toContain("prices.voltline.test")
    expect(addition).toContain("/v1/gpu-prices")
  })
})
