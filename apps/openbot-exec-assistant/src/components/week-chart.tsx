import { Bar, BarChart, XAxis, YAxis } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { weekLoad } from "@/lib/week"
import type { CalendarEvent } from "@/lib/types"

const chartConfig = {
  hours: { label: "Hours booked", color: "var(--chart-1)" },
} satisfies ChartConfig

export function WeekChart({ events }: { events: CalendarEvent[] }) {
  const data = weekLoad(events)
  return (
    <section className="rounded-xl bg-card p-3 ring-1 ring-foreground/10">
      <h2 className="font-heading text-xl">Week load</h2>
      <p className="mt-1 text-xs text-muted-foreground">Hours on the sample calendar, Monday through Friday. Declined holds drop off.</p>
      <ChartContainer config={chartConfig} className="mt-2 aspect-auto h-40 w-full">
        <BarChart data={data} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
          <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
          <YAxis hide />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Bar dataKey="hours" fill="var(--color-hours)" radius={6} />
        </BarChart>
      </ChartContainer>
    </section>
  )
}
