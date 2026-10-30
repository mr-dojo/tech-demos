import { Badge } from "@/components/ui/badge"
import { formatSpan } from "@/lib/format"
import { conflictIds, dayEvents } from "@/lib/week"
import type { DeskState } from "@/lib/types"

export function CalendarRail({ desk }: { desk: DeskState }) {
  const events = dayEvents(desk)
  const conflicts = conflictIds(events)
  return (
    <section>
      <p className="text-[0.68rem] tracking-wide text-muted-foreground uppercase">Friday 30 Oct</p>
      <h2 className="font-heading text-xl">Jun’s day</h2>
      <ol className="mt-3 space-y-2">
        {events.map((event) => {
          const clash = conflicts.has(event.id)
          return (
            <li
              key={event.id}
              className={`rounded-xl px-3 py-2 ring-1 ${clash ? "bg-[oklch(0.96_0.03_25)] ring-[oklch(0.7_0.12_25)]" : "bg-card ring-foreground/10"} ${event.status === "declined" ? "opacity-60" : ""}`}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium">{event.title}</p>
                <Badge variant={event.status === "tentative" ? "outline" : "secondary"}>{event.status}</Badge>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{formatSpan(event.start, event.end)}</p>
              <p className="text-xs text-muted-foreground">{event.location}</p>
              {clash ? <p className="mt-1 text-xs font-medium text-[oklch(0.45_0.14_25)]">Overlaps another hold</p> : null}
            </li>
          )
        })}
      </ol>
    </section>
  )
}
