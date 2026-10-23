import { kindOf } from "@/lib/kind"
import type {
  AnalysisFile,
  GraphFile,
  GraphLink,
  GraphNode,
  IncidentEdge,
  Kind,
  MetaFile,
  Surprise,
} from "@/lib/types"
import { surpriseKey } from "@/lib/why"

export type Atlas = {
  meta: MetaFile
  nodes: GraphNode[]
  links: GraphLink[]
  byId: Map<string, GraphNode>
  degree: Map<string, number>
  kind: Map<string, Kind>
  neighbors: Map<string, string[]>
  incident: Map<string, IncidentEdge[]>
  surprises: Map<string, Surprise>
  gods: AnalysisFile["gods"]
  communitySize: Map<number, number>
}

function endpoint(value: unknown): string {
  if (typeof value === "string") return value
  if (value && typeof value === "object" && "id" in value) {
    const id = (value as { id?: unknown }).id
    if (typeof id === "string" || typeof id === "number") return String(id)
  }
  return ""
}

export function buildAtlas(graph: GraphFile, analysis: AnalysisFile, meta: MetaFile): Atlas {
  const nodes = graph.nodes ?? []
  const links = (graph.links ?? graph.edges ?? []).map((link) => ({
    ...link,
    source: endpoint(link.source),
    target: endpoint(link.target),
  }))
  const byId = new Map(nodes.map((node) => [node.id, node]))
  const degree = new Map<string, number>()
  const neighbors = new Map<string, Set<string>>()
  const incident = new Map<string, IncidentEdge[]>()
  const kind = new Map<string, Kind>()
  const communitySize = new Map<number, number>()

  for (const node of nodes) {
    degree.set(node.id, 0)
    neighbors.set(node.id, new Set())
    incident.set(node.id, [])
    kind.set(node.id, kindOf(node))
    if (typeof node.community === "number") {
      communitySize.set(node.community, (communitySize.get(node.community) ?? 0) + 1)
    }
  }

  links.forEach((link, index) => {
    const source = byId.get(link.source)
    const target = byId.get(link.target)
    if (!source || !target) return
    degree.set(source.id, (degree.get(source.id) ?? 0) + 1)
    degree.set(target.id, (degree.get(target.id) ?? 0) + 1)
    neighbors.get(source.id)?.add(target.id)
    neighbors.get(target.id)?.add(source.id)
    incident.get(source.id)?.push({ index, direction: "out", otherId: target.id, link })
    incident.get(target.id)?.push({ index, direction: "in", otherId: source.id, link })
  })

  const surprises = new Map<string, Surprise>()
  for (const surprise of analysis.surprises ?? []) {
    surprises.set(
      surpriseKey(surprise.relation ?? "", surprise.source, surprise.target),
      surprise,
    )
  }

  return {
    meta,
    nodes,
    links,
    byId,
    degree,
    kind,
    neighbors: new Map([...neighbors].map(([id, set]) => [id, [...set]])),
    incident,
    surprises,
    gods: analysis.gods ?? [],
    communitySize,
  }
}

export function nodeSummary(atlas: Atlas, node: GraphNode): string {
  const kind = atlas.kind.get(node.id) ?? kindOf(node)
  const where = node.source_file
    ? `${node.source_file}${node.source_location ? ` ${node.source_location}` : ""}`
    : "no source file on this node"
  const community =
    typeof node.community === "number"
      ? ` Community ${node.community} holds ${atlas.communitySize.get(node.community) ?? 0} nodes.`
      : ""
  const degree = atlas.degree.get(node.id) ?? 0
  const rationale =
    typeof node.rationale === "string" && node.rationale.trim()
      ? ""
      : " This code-only extract did not attach a rationale attribute."
  return `${kindLabel(kind)} recorded at ${where}.${community} ${degree} connection${degree === 1 ? "" : "s"}.${rationale}`
}

function kindLabel(kind: Kind): string {
  if (kind === "module") return "Module"
  if (kind === "function") return "Function"
  if (kind === "class") return "Class"
  if (kind === "concept") return "Concept"
  if (kind === "external") return "External reference"
  return "Symbol"
}

export function surpriseFor(
  atlas: Atlas,
  from: GraphNode,
  to: GraphNode,
  link: GraphLink,
): Surprise | undefined {
  return atlas.surprises.get(surpriseKey(link.relation ?? "", from.label, to.label))
}
