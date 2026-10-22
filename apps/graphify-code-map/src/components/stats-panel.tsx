import { Bar, BarChart, XAxis, YAxis } from "recharts"
import { Badge } from "@/components/ui/badge"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { KIND_COLOR, KIND_LABEL } from "@/lib/kind"
import type { Atlas } from "@/lib/model"
import { countsByConfidence, countsByKind, countsByRelation, moduleCoupling } from "@/lib/stats"
import type { Kind } from "@/lib/types"

const chartConfig = {
  crossFileEdges: { label: "Cross-file edges", color: "#0f766e" },
}

const CONFIDENCE_COLOR: Record<string, string> = {
  EXTRACTED: "#059669",
  INFERRED: "#d97706",
  AMBIGUOUS: "#e11d48",
}

export function StatsPanel({ atlas, onOpen }: { atlas: Atlas; onOpen: (id: string) => void }) {
  const kinds = countsByKind(atlas)
  const relations = countsByRelation(atlas)
  const confidence = countsByConfidence(atlas)
  const coupling = moduleCoupling(atlas)
  const confidenceTotal = confidence.reduce((sum, row) => sum + row.count, 0) || 1
  const relationMax = relations[0]?.count ?? 1

  return (
    <div className="flex flex-col gap-4 p-4">
      <div>
        <p className="text-xs tracking-[0.16em] text-muted-foreground uppercase">Atlas</p>
        <h2 className="font-heading text-2xl">Voltline at a glance</h2>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{atlas.meta.semanticNote}</p>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Metric label="Nodes" value={atlas.nodes.length} />
        <Metric label="Edges" value={atlas.links.length} />
        <Metric label="Communities" value={atlas.meta.communityCount} />
      </div>

      <section className="rounded-xl border bg-card p-3">
        <h3 className="font-heading text-base">Nodes by kind</h3>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {kinds.map((row) => (
            <div key={row.key} className="flex items-center justify-between gap-2 rounded-lg bg-muted/70 px-2.5 py-2">
              <span className="flex items-center gap-2 text-sm">
                <span
                  className="size-2.5 rounded-full"
                  style={{ background: KIND_COLOR[row.key as Kind] ?? "#a8a29e" }}
                />
                {KIND_LABEL[row.key as Kind] ?? row.key}
              </span>
              <span className="font-heading text-lg">{row.count}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border bg-card p-3">
        <h3 className="font-heading text-base">Confidence</h3>
        <div className="mt-3 flex h-3 overflow-hidden rounded-full bg-muted">
          {confidence.map((row) => (
            <div
              key={row.key}
              style={{
                width: `${(row.count / confidenceTotal) * 100}%`,
                background: CONFIDENCE_COLOR[row.key] ?? "#78716c",
              }}
              title={`${row.key} ${row.count}`}
            />
          ))}
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          {confidence.map((row) => (
            <Badge key={row.key} variant="outline">
              {row.key} {row.count}
            </Badge>
          ))}
        </div>
      </section>

      <section className="rounded-xl border bg-card p-3">
        <h3 className="font-heading text-base">Edges by relation</h3>
        <ul className="mt-3 space-y-2">
          {relations.map((row) => (
            <li key={row.key}>
              <div className="mb-1 flex items-baseline justify-between text-sm">
                <span>{row.key}</span>
                <span className="text-muted-foreground">{row.count}</span>
              </div>
              <div className="h-2 rounded-full bg-muted">
                <div
                  className="h-2 rounded-full bg-[#0f766e]"
                  style={{ width: `${(row.count / relationMax) * 100}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-xl border bg-card p-3">
        <h3 className="font-heading text-base">Module coupling</h3>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          Cross-file edges touching each source file. A taller bar means the file reaches more of the rest of Voltline.
        </p>
        <ChartContainer config={chartConfig} className="mt-2 aspect-auto h-64 w-full">
          <BarChart data={coupling} layout="vertical" margin={{ left: 4, right: 8, top: 8, bottom: 0 }}>
            <XAxis type="number" hide />
            <YAxis
              type="category"
              dataKey="name"
              width={108}
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11 }}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="crossFileEdges" fill="var(--color-crossFileEdges)" radius={4} />
          </BarChart>
        </ChartContainer>
      </section>

      <section>
        <h3 className="font-heading text-base">Most-connected symbols</h3>
        <p className="mt-1 text-xs text-muted-foreground">Graphify god nodes, ranked by degree.</p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {atlas.gods.slice(0, 6).map((god, index) => (
            <button
              key={god.id}
              type="button"
              onClick={() => onOpen(god.id)}
              className="rounded-xl border bg-card px-3 py-2 text-left hover:bg-muted/70"
            >
              <p className="text-[0.68rem] tracking-wide text-muted-foreground uppercase">#{index + 1}</p>
              <p className="mt-1 truncate text-sm font-medium" title={god.label}>
                {god.label}
              </p>
              <p className="font-heading text-xl">{god.degree}</p>
            </button>
          ))}
        </div>
      </section>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-[#10151c] px-2 py-3 text-[#f5f0e6]">
      <p className="text-[0.68rem] tracking-wide text-[#a8a29e] uppercase">{label}</p>
      <p className="font-heading text-2xl">{value}</p>
    </div>
  )
}
