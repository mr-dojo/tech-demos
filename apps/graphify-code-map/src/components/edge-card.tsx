import { Badge } from "@/components/ui/badge"
import { explainEdge } from "@/lib/why"
import { surpriseFor, type Atlas } from "@/lib/model"
import type { IncidentEdge } from "@/lib/types"

const CONFIDENCE_TONE: Record<string, string> = {
  EXTRACTED: "border-l-emerald-500",
  INFERRED: "border-l-amber-500",
  AMBIGUOUS: "border-l-rose-500",
}

export function EdgeCard({
  atlas,
  edge,
  ownerId,
  onOpen,
}: {
  atlas: Atlas
  edge: IncidentEdge
  ownerId: string
  onOpen: (id: string) => void
}) {
  const owner = atlas.byId.get(ownerId)
  const other = atlas.byId.get(edge.otherId)
  if (!owner || !other) return null
  const from = edge.direction === "out" ? owner : other
  const to = edge.direction === "out" ? other : owner
  const surprise = surpriseFor(atlas, from, to, edge.link)
  const sentence = explainEdge({
    fromLabel: from.label,
    toLabel: to.label,
    relation: edge.link.relation,
    confidence: edge.link.confidence,
    confidenceScore: edge.link.confidence_score,
    sourceFile: edge.link.source_file,
    sourceLocation: edge.link.source_location,
    surpriseWhy: surprise?.why,
  })
  const tone = CONFIDENCE_TONE[edge.link.confidence ?? ""] ?? "border-l-stone-400"

  return (
    <button
      type="button"
      onClick={() => onOpen(other.id)}
      className={`w-full rounded-xl border border-border bg-card p-3 text-left border-l-4 ${tone} transition-colors hover:bg-muted/60`}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="outline">{edge.direction === "out" ? "outgoing" : "incoming"}</Badge>
        <Badge variant="secondary">{edge.link.relation ?? "link"}</Badge>
        <Badge variant={edge.link.confidence === "EXTRACTED" ? "default" : "outline"}>
          {edge.link.confidence ?? "untagged"}
        </Badge>
      </div>
      <p className="mt-2 font-medium">{other.label}</p>
      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{sentence}</p>
    </button>
  )
}
