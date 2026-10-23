import type { Atlas } from "@/lib/model"
import type { GraphNode } from "@/lib/types"

export const HIGHLIGHT_CAP = 48

const STOPWORDS = new Set([
  "how",
  "what",
  "why",
  "when",
  "where",
  "which",
  "who",
  "whom",
  "whose",
  "does",
  "did",
  "is",
  "are",
  "was",
  "were",
  "be",
  "been",
  "being",
  "can",
  "could",
  "should",
  "would",
  "will",
  "shall",
  "may",
  "might",
  "must",
  "has",
  "have",
  "had",
  "the",
  "and",
  "but",
  "not",
  "for",
  "from",
  "with",
  "without",
  "into",
  "onto",
  "off",
  "that",
  "this",
  "these",
  "those",
  "there",
  "here",
  "its",
  "their",
  "them",
  "they",
  "about",
  "any",
  "all",
  "some",
  "work",
  "works",
  "working",
])

export type SearchHit = {
  terms: string[]
  seeds: string[]
  nodeIds: string[]
  hops: Record<string, number>
  empty: boolean
  truncated: boolean
  reached: number
}

export function queryTerms(question: string): string[] {
  const raw = question.toLowerCase().match(/\w+/g) ?? []
  const content = raw.filter((term) => term.length > 1 && !STOPWORDS.has(term))
  return content.length > 0 ? content : raw
}

function scoreNode(node: GraphNode, terms: string[]): number {
  const label = node.label.toLowerCase()
  const norm = (node.norm_label ?? "").toLowerCase()
  const file = (node.source_file ?? "").toLowerCase()
  const rationale = (node.rationale ?? "").toLowerCase()
  let score = 0
  for (const term of terms) {
    if (label === term || norm === term) score += 1000
    else if (label.startsWith(term) || norm.startsWith(term)) score += 100
    else if (label.includes(term) || norm.includes(term)) score += 1
    else if (rationale.includes(term)) score += 0.75
    else if (file.includes(term)) score += 0.5
  }
  return score
}

export function searchGraph(question: string, atlas: Atlas): SearchHit | null {
  const trimmed = question.trim()
  if (!trimmed) return null
  const terms = queryTerms(trimmed)
  const scored = atlas.nodes
    .map((node) => ({ id: node.id, score: scoreNode(node, terms) }))
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))

  if (scored.length === 0) {
    return { terms, seeds: [], nodeIds: [], hops: {}, empty: true, truncated: false, reached: 0 }
  }

  const seeds = scored.slice(0, 4).map((row) => row.id)
  const scoreOf = new Map(scored.map((row) => [row.id, row.score]))
  const hops: Record<string, number> = {}
  for (const id of seeds) hops[id] = 0
  let frontier = [...seeds]
  for (let hop = 1; hop <= 2; hop += 1) {
    const next: string[] = []
    for (const id of frontier) {
      for (const neighbor of atlas.neighbors.get(id) ?? []) {
        if (hops[neighbor] !== undefined) continue
        hops[neighbor] = hop
        next.push(neighbor)
      }
    }
    frontier = next
  }

  const reached = Object.keys(hops)
  reached.sort((a, b) => {
    const hopDelta = (hops[a] ?? 0) - (hops[b] ?? 0)
    if (hopDelta !== 0) return hopDelta
    return (scoreOf.get(b) ?? 0) - (scoreOf.get(a) ?? 0) || a.localeCompare(b)
  })
  const nodeIds = reached.slice(0, HIGHLIGHT_CAP)
  const kept = new Set(nodeIds)
  const trimmedHops: Record<string, number> = {}
  for (const id of nodeIds) {
    const hop = hops[id]
    if (hop !== undefined) trimmedHops[id] = hop
  }
  return {
    terms,
    seeds: seeds.filter((id) => kept.has(id)),
    nodeIds,
    hops: trimmedHops,
    empty: false,
    truncated: reached.length > nodeIds.length,
    reached: reached.length,
  }
}
