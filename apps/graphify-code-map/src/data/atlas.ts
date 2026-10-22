import analysisJson from "@/data/analysis.json"
import graphJson from "@/data/graph.json"
import metaJson from "@/data/meta.json"
import { buildAtlas } from "@/lib/model"
import type { AnalysisFile, GraphFile, MetaFile } from "@/lib/types"

export const atlas = buildAtlas(
  graphJson as GraphFile,
  analysisJson as AnalysisFile,
  metaJson as MetaFile,
)
