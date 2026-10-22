import { baseName } from "@/lib/kind"
import type { Atlas } from "@/lib/model"
import type { Kind } from "@/lib/types"

export type CountRow = { key: string; count: number }
export type CouplingRow = { file: string; name: string; crossFileEdges: number }

function rowsFrom(counts: Map<string, number>): CountRow[] {
  return [...counts]
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key))
}

export function countsByKind(atlas: Atlas): CountRow[] {
  const counts = new Map<string, number>()
  for (const node of atlas.nodes) {
    const kind: Kind = atlas.kind.get(node.id) ?? "symbol"
    counts.set(kind, (counts.get(kind) ?? 0) + 1)
  }
  return rowsFrom(counts)
}

export function countsByRelation(atlas: Atlas): CountRow[] {
  const counts = new Map<string, number>()
  for (const link of atlas.links) {
    const key = link.relation || "unknown"
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return rowsFrom(counts)
}

export function countsByConfidence(atlas: Atlas): CountRow[] {
  const counts = new Map<string, number>()
  for (const link of atlas.links) {
    const key = link.confidence || "unknown"
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return rowsFrom(counts)
}

export function moduleCoupling(atlas: Atlas, limit = 8): CouplingRow[] {
  const counts = new Map<string, number>()
  for (const link of atlas.links) {
    const source = atlas.byId.get(link.source)
    const target = atlas.byId.get(link.target)
    const sourceFile = source?.source_file
    const targetFile = target?.source_file
    if (!sourceFile || !targetFile || sourceFile === targetFile) continue
    counts.set(sourceFile, (counts.get(sourceFile) ?? 0) + 1)
    counts.set(targetFile, (counts.get(targetFile) ?? 0) + 1)
  }
  return [...counts]
    .map(([file, crossFileEdges]) => ({ file, name: baseName(file), crossFileEdges }))
    .sort((a, b) => b.crossFileEdges - a.crossFileEdges || a.file.localeCompare(b.file))
    .slice(0, limit)
}
