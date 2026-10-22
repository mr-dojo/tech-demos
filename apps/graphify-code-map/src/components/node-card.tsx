import { EdgeCard } from "@/components/edge-card"
import { Badge } from "@/components/ui/badge"
import { atlas } from "@/data/atlas"
import { KIND_COLOR, KIND_LABEL } from "@/lib/kind"
import { nodeSummary } from "@/lib/model"

export function NodeCard({
  nodeId,
  onOpen,
  onClose,
}: {
  nodeId: string
  onOpen: (id: string) => void
  onClose: () => void
}) {
  const node = atlas.byId.get(nodeId)
  if (!node) return null
  const kind = atlas.kind.get(node.id) ?? "symbol"
  const edges = [...(atlas.incident.get(node.id) ?? [])].sort((a, b) => {
    if (a.direction !== b.direction) return a.direction === "out" ? -1 : 1
    const aLabel = atlas.byId.get(a.otherId)?.label ?? ""
    const bLabel = atlas.byId.get(b.otherId)?.label ?? ""
    return aLabel.localeCompare(bLabel)
  })
  const degree = atlas.degree.get(node.id) ?? 0

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs tracking-[0.16em] text-muted-foreground uppercase">Node</p>
          <h2 className="font-heading text-2xl leading-tight text-balance">{node.label}</h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-lg border px-2 py-1 text-xs text-muted-foreground hover:bg-muted"
        >
          Close
        </button>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <Badge style={{ background: KIND_COLOR[kind], color: "#1c1917" }}>{KIND_LABEL[kind]}</Badge>
        <Badge variant="outline">{node.file_type ?? "untyped"}</Badge>
        {typeof node.community === "number" ? (
          <Badge variant="secondary">Community {node.community}</Badge>
        ) : null}
      </div>

      <p className="text-sm leading-relaxed">{nodeSummary(atlas, node)}</p>

      <div className="grid grid-cols-2 gap-2">
        <Fact label="Location" value={node.source_file ?? "—"} />
        <Fact label="Line" value={node.source_location ?? "—"} />
        <Fact label="Connections" value={String(degree)} />
        <Fact
          label="In this community"
          value={
            typeof node.community === "number"
              ? String(atlas.communitySize.get(node.community) ?? 0)
              : "—"
          }
        />
      </div>

      {node.rationale ? (
        <blockquote className="rounded-xl bg-muted px-3 py-2 text-sm leading-relaxed">
          {node.rationale}
        </blockquote>
      ) : null}

      <div className="min-h-0 flex-1 space-y-2 overflow-auto pr-1">
        <p className="text-xs tracking-[0.16em] text-muted-foreground uppercase">
          {edges.length} connection{edges.length === 1 ? "" : "s"}
        </p>
        {edges.map((edge) => (
          <EdgeCard key={`${edge.index}-${edge.direction}`} edge={edge} ownerId={node.id} onOpen={onOpen} />
        ))}
      </div>
    </div>
  )
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-muted/70 px-3 py-2">
      <p className="text-[0.68rem] tracking-wide text-muted-foreground uppercase">{label}</p>
      <p className="mt-1 truncate text-sm font-medium" title={value}>
        {value}
      </p>
    </div>
  )
}
