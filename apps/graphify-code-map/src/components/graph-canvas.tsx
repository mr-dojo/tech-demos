import { useEffect, useMemo, useRef, useState } from "react"
import ForceGraph2D, {
  type ForceGraphMethods,
  type LinkObject,
  type NodeObject,
} from "react-force-graph-2d"
import { atlas } from "@/data/atlas"
import { KIND_COLOR } from "@/lib/kind"
import type { Kind } from "@/lib/types"

type ViewNode = {
  id: string
  label: string
  kind: Kind
  degree: number
}

type ViewLink = {
  source: string
  target: string
  relation: string
}

type GraphNode = NodeObject<ViewNode>
type GraphLink = LinkObject<ViewNode, ViewLink>

function endpointId(value: unknown): string {
  if (typeof value === "string" || typeof value === "number") return String(value)
  if (value && typeof value === "object" && "id" in value) {
    const id = (value as { id?: unknown }).id
    if (typeof id === "string" || typeof id === "number") return String(id)
  }
  return ""
}

function radius(degree: number): number {
  return Math.max(3.4, Math.sqrt(degree + 1) * 1.7)
}

export function GraphCanvas({
  highlight,
  selectedId,
  onSelect,
}: {
  highlight: ReadonlySet<string> | null
  selectedId: string | null
  onSelect: (id: string) => void
}) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const fgRef = useRef<ForceGraphMethods<ViewNode, ViewLink> | undefined>(undefined)
  const [size, setSize] = useState({ width: 0, height: 0 })
  const [hoverId, setHoverId] = useState<string | null>(null)
  const highlightKey = highlight ? [...highlight].sort().join("|") : ""

  const graphData = useMemo(
    () => ({
      nodes: atlas.nodes.map((node) => ({
        id: node.id,
        label: node.label,
        kind: atlas.kind.get(node.id) ?? "symbol",
        degree: atlas.degree.get(node.id) ?? 0,
      })),
      links: atlas.links.map((link) => ({
        source: link.source,
        target: link.target,
        relation: link.relation ?? "",
      })),
    }),
    [],
  )

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const measure = () => setSize({ width: el.clientWidth, height: el.clientHeight })
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const fg = fgRef.current
    if (!fg || size.width === 0) return
    const timer = window.setTimeout(() => {
      if (highlight && highlight.size > 0) {
        fg.zoomToFit(450, 56, (node) => highlight.has(String(node.id)))
        return
      }
      fg.zoomToFit(450, 40)
    }, 40)
    return () => window.clearTimeout(timer)
  }, [highlight, highlightKey, size.width, size.height])

  return (
    <div ref={wrapRef} className="relative h-full min-h-[420px] w-full bg-[#10151c]">
      <div className="pointer-events-none absolute top-4 left-4 z-10 flex flex-col gap-1">
        <p className="font-heading text-lg text-[#f5f0e6]">Voltline map</p>
        <p className="text-xs tracking-wide text-[#a8a29e] uppercase">
          {atlas.meta.nodeCount} nodes · {atlas.meta.edgeCount} edges · communities{" "}
          {atlas.meta.communityCount}
        </p>
      </div>
      {size.width > 0 && size.height > 0 ? (
        <ForceGraph2D<ViewNode, ViewLink>
          ref={fgRef}
          graphData={graphData}
          width={size.width}
          height={size.height}
          backgroundColor="#10151c"
          autoPauseRedraw={false}
          cooldownTicks={90}
          d3AlphaDecay={0.035}
          d3VelocityDecay={0.32}
          minZoom={0.15}
          maxZoom={8}
          onNodeClick={(node) => {
            if (node.id) onSelect(String(node.id))
          }}
          onNodeHover={(node) => setHoverId(node?.id ? String(node.id) : null)}
          nodeCanvasObjectMode={() => "replace"}
          nodeCanvasObject={(node: GraphNode, ctx, scale) => {
            if (node.x == null || node.y == null || node.id == null) return
            const id = String(node.id)
            const active = !highlight || highlight.has(id)
            const r = radius(node.degree ?? 0)
            ctx.beginPath()
            ctx.arc(node.x, node.y, r, 0, Math.PI * 2)
            ctx.fillStyle = KIND_COLOR[node.kind ?? "symbol"]
            ctx.globalAlpha = active ? 0.95 : 0.08
            ctx.fill()
            if (id === selectedId) {
              ctx.lineWidth = 2 / scale
              ctx.strokeStyle = "#f8fafc"
              ctx.stroke()
            }
            const showLabel =
              id === selectedId || id === hoverId || (active && (scale > 2.8 || (highlight?.has(id) && scale > 1.15)))
            if (showLabel) {
              const fontSize = 11 / scale
              ctx.font = `500 ${fontSize}px "Geist Variable", sans-serif`
              ctx.textAlign = "left"
              ctx.textBaseline = "middle"
              ctx.fillStyle = active ? "#f5f0e6" : "#78716c"
              ctx.fillText(node.label ?? id, node.x + r + 1.4 / scale, node.y)
            }
            ctx.globalAlpha = 1
          }}
          nodePointerAreaPaint={(node: GraphNode, color, ctx) => {
            if (node.x == null || node.y == null) return
            ctx.fillStyle = color
            ctx.beginPath()
            ctx.arc(node.x, node.y, radius(node.degree ?? 0) + 1, 0, Math.PI * 2)
            ctx.fill()
          }}
          linkColor={(link: GraphLink) => {
            const source = endpointId(link.source)
            const target = endpointId(link.target)
            const active = !highlight || (highlight.has(source) && highlight.has(target))
            if (!active) return "rgba(231, 229, 228, 0.045)"
            if (link.relation === "calls" || link.relation === "indirect_call") return "rgba(45, 212, 191, 0.7)"
            if (link.relation === "imports" || link.relation === "imports_from") return "rgba(56, 189, 248, 0.55)"
            return "rgba(245, 240, 230, 0.28)"
          }}
          linkWidth={(link: GraphLink) => {
            const source = endpointId(link.source)
            const target = endpointId(link.target)
            const active = !highlight || (highlight.has(source) && highlight.has(target))
            if (selectedId && (source === selectedId || target === selectedId)) return 1.6
            return active ? 0.7 : 0.25
          }}
        />
      ) : null}
    </div>
  )
}
