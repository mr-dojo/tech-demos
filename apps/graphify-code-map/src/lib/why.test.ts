/// <reference types="bun" />
import { describe, expect, test } from "bun:test"
import { atlas } from "@/data/atlas"
import { explainEdge } from "@/lib/why"
import { surpriseFor } from "@/lib/model"

describe("edge explanation", () => {
  test("renders relation, confidence, and source file from Graphify fields", () => {
    const sentence = explainEdge({
      fromLabel: "placePickupOrder()",
      toLabel: "getPart()",
      relation: "calls",
      confidence: "EXTRACTED",
      confidenceScore: 1,
      sourceFile: "src/lib/shopper.ts",
      sourceLocation: "L380",
    })
    expect(sentence).toContain("placePickupOrder() calls getPart()")
    expect(sentence).toContain("extracted this directly")
    expect(sentence).toContain("src/lib/shopper.ts L380")
  })

  test("appends Graphify's surprise why when the analysis recorded one", () => {
    const surprise = atlas.surprises.values().next().value
    expect(surprise?.why.length).toBeGreaterThan(0)
    const sentence = explainEdge({
      fromLabel: surprise?.source ?? "",
      toLabel: surprise?.target ?? "",
      relation: surprise?.relation,
      confidence: surprise?.confidence,
      surpriseWhy: surprise?.why,
    })
    expect(sentence).toContain(surprise?.why ?? "")
  })

  test("a stored surprise matches its edge endpoints", () => {
    const found = [...atlas.surprises.values()].some((surprise) => {
      const from = atlas.nodes.find((node) => node.label === surprise.source)
      const to = atlas.nodes.find((node) => node.label === surprise.target)
      if (!from || !to) return false
      const link = atlas.links.find(
        (edge) =>
          edge.source === from.id &&
          edge.target === to.id &&
          edge.relation === surprise.relation,
      )
      return link ? surpriseFor(atlas, from, to, link)?.why === surprise.why : false
    })
    expect(found).toBe(true)
  })
})
