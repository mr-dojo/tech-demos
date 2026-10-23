/// <reference types="bun" />
import { describe, expect, test } from "bun:test"
import { readCommittedAtlas } from "@/data/committed-atlas"
import { buildAtlas } from "@/lib/model"
import { countsByKind, countsByRelation, moduleCoupling } from "@/lib/stats"
import type { AnalysisFile, GraphFile, MetaFile } from "@/lib/types"

const atlas = readCommittedAtlas()

const meta: MetaFile = {
  graphifyVersion: "test",
  package: "graphifyy",
  command: "test",
  corpus: "fixture",
  builtAtCommit: "",
  generatedAt: "",
  semantic: false,
  semanticNote: "",
  queryMode: "local-neighborhood",
  queryNote: "",
  nodeCount: 3,
  edgeCount: 2,
  communityCount: 1,
}

const analysis: AnalysisFile = { gods: [], surprises: [] }

function fixture(): ReturnType<typeof buildAtlas> {
  const graph: GraphFile = {
    graph: { graphify_version: "test" },
    nodes: [
      {
        id: "a",
        label: "alpha()",
        file_type: "code",
        source_file: "src/a.ts",
        _callable: true,
      },
      {
        id: "b",
        label: "beta()",
        file_type: "code",
        source_file: "src/b.ts",
        _callable: true,
      },
      {
        id: "file",
        label: "a.ts",
        file_type: "code",
        source_file: "src/a.ts",
      },
    ],
    links: [
      { source: "a", target: "b", relation: "calls", confidence: "EXTRACTED" },
      { source: "file", target: "a", relation: "contains", confidence: "EXTRACTED" },
    ],
  }
  return buildAtlas(graph, analysis, meta)
}

describe("stats", () => {
  test("groups the fixture by kind and relation", () => {
    const graph = fixture()
    expect(countsByKind(graph)).toEqual([
      { key: "function", count: 2 },
      { key: "module", count: 1 },
    ])
    expect(countsByRelation(graph).map((row) => row.key)).toEqual(["calls", "contains"])
  })

  test("ranks files by cross-file edges", () => {
    const rows = moduleCoupling(fixture())
    expect(rows.map((row) => row.file)).toEqual(["src/a.ts", "src/b.ts"])
    expect(rows[0]?.crossFileEdges).toBe(1)
    expect(rows[1]?.crossFileEdges).toBe(1)
  })

  test("the committed snapshot is a real Graphify graph", () => {
    expect(atlas.meta.graphifyVersion).toBe("0.9.94")
    expect(atlas.meta.semantic).toBe(false)
    expect(atlas.nodes.length).toBe(331)
    expect(atlas.links.length).toBe(683)
    expect(atlas.nodes.some((node) => node.label === "placePickupOrder()")).toBe(true)
    const coupling = moduleCoupling(atlas)
    expect(coupling.length).toBeGreaterThan(1)
    expect(coupling[0]!.crossFileEdges).toBeGreaterThanOrEqual(coupling[1]!.crossFileEdges)
    const hub = atlas.gods[0]
    expect(hub && atlas.degree.get(hub.id)).toBe(hub?.degree)
  })
})