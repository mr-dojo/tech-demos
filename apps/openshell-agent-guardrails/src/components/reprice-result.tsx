"use client"

import { Badge } from "@/components/ui/badge"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import type { RepriceLine } from "@/lib/reprice"
import type { PublishDecision } from "@/lib/reprice"
import { Bar, BarChart, XAxis, YAxis } from "recharts"

const chartConfig = {
  shelf: { label: "Shelf", color: "oklch(0.55 0 0)" },
  suggested: { label: "Suggested", color: "oklch(0.72 0.16 75)" },
}

const actionVariant = {
  raise: "destructive",
  cut: "secondary",
  hold: "outline",
  skip: "outline",
} as const

export function RepriceResult({ lines, decision }: { lines: RepriceLine[]; decision: PublishDecision }) {
  const movers = lines.filter((line) => line.action === "raise" || line.action === "cut")
  const rows = lines
    .filter((line) => line.action !== "skip")
    .map((line) => ({
      name: line.name.replace("GeForce ", "").replace("Radeon ", ""),
      shelf: line.shelfPrice,
      suggested: line.suggestedPrice,
    }))

  const status =
    decision === "approved"
      ? "Published in this replay. Eight in-stock suggestions would be written. The GTX 1070 stays off the list."
      : decision === "denied"
        ? "Withheld. The suggestions below were computed locally and were not written."
        : "Waiting on the policy decision before anything is published."

  return (
    <section className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-base font-medium">GPU repricing</h2>
        <Badge variant={decision === "approved" ? "default" : "outline"}>
          {decision === "approved" ? "Published" : decision === "denied" ? "Withheld" : "Waiting"}
        </Badge>
      </div>
      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{status}</p>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {movers.map((line) => (
          <div key={line.sku} className="rounded-lg bg-muted/70 px-3 py-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium">{line.name}</p>
              <Badge variant={actionVariant[line.action]}>{line.action}</Badge>
            </div>
            <p className="mt-1 text-sm">
              ${line.shelfPrice} → ${line.suggestedPrice}
              <span className="text-muted-foreground"> · floor ${line.floorPrice}</span>
            </p>
          </div>
        ))}
      </div>

      <ChartContainer config={chartConfig} className="mt-3 aspect-auto h-72 w-full">
        <BarChart data={rows} layout="vertical" margin={{ left: 4, right: 8, top: 8, bottom: 0 }}>
          <XAxis type="number" hide />
          <YAxis type="category" dataKey="name" width={118} tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Bar dataKey="shelf" fill="var(--color-shelf)" radius={4} />
          <Bar dataKey="suggested" fill="var(--color-suggested)" radius={4} />
        </BarChart>
      </ChartContainer>
    </section>
  )
}
