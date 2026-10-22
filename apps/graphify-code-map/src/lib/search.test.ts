/// <reference types="bun" />
import { describe, expect, test } from "bun:test"
import { readCommittedAtlas } from "@/data/committed-atlas"
import { queryTerms, searchGraph } from "@/lib/search"

const atlas = readCommittedAtlas()

describe("query terms", () => {
  test("drops question words and keeps the subject", () => {
    expect(queryTerms("what touches the cart?")).toEqual(["touches", "cart"])
    expect(queryTerms("how does pickup work")).toEqual(["pickup"])
  })
})

describe("neighborhood search", () => {
  test("pickup seeds pickup symbols and includes a neighbor", () => {
    const hit = searchGraph("pickup", atlas)
    expect(hit).not.toBeNull()
    expect(hit?.empty).toBe(false)
    expect(hit && hit.seeds.length > 0).toBe(true)
    const labels = (hit?.nodeIds ?? []).map((id) => atlas.byId.get(id)?.label.toLowerCase() ?? "")
    expect(labels.some((label) => label.includes("pickup"))).toBe(true)
    expect(hit && hit.nodeIds.length > hit.seeds.length).toBe(true)
  })

  test("cart has no node in the Voltline graph", () => {
    const hit = searchGraph("what touches the cart?", atlas)
    expect(hit?.empty).toBe(true)
    expect(hit?.nodeIds).toEqual([])
  })

  test("a blank question does not filter the map", () => {
    expect(searchGraph("   ", atlas)).toBeNull()
  })
})
