import { readFileSync } from "node:fs"
import path from "node:path"
import analysisJson from "@/data/analysis.json"
import metaJson from "@/data/meta.json"
import { buildAtlas, type Atlas } from "@/lib/model"
import type { AnalysisFile, GraphFile, MetaFile } from "@/lib/types"

export function readCommittedAtlas(): Atlas {
  const graphPath = path.resolve(import.meta.dirname, "../../public/graph.json")
  const graph = JSON.parse(readFileSync(graphPath, "utf8")) as GraphFile
  return buildAtlas(graph, analysisJson as AnalysisFile, metaJson as MetaFile)
}
