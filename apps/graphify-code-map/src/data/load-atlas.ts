import analysisJson from "@/data/analysis.json"
import metaJson from "@/data/meta.json"
import { buildAtlas, type Atlas } from "@/lib/model"
import type { AnalysisFile, GraphFile, MetaFile } from "@/lib/types"

export async function loadAtlas(): Promise<Atlas> {
  const response = await fetch(`${import.meta.env.BASE_URL}graph.json`)
  if (!response.ok) {
    throw new Error(`Could not load the graph snapshot (${response.status})`)
  }
  const graph = (await response.json()) as GraphFile
  return buildAtlas(graph, analysisJson as AnalysisFile, metaJson as MetaFile)
}

export type { Atlas }
