import { hoursBetween, localDay } from "./format"
import type { CalendarEvent, DeskState } from "./types"
import { DEMO_TODAY } from "./types"

export type WeekBar = {
  day: string
  label: string
  hours: number
}

const WEEK = [
  { day: "2026-10-26", label: "Mon" },
  { day: "2026-10-27", label: "Tue" },
  { day: "2026-10-28", label: "Wed" },
  { day: "2026-10-29", label: "Thu" },
  { day: "2026-10-30", label: "Fri" },
]

export function weekLoad(events: CalendarEvent[]): WeekBar[] {
  return WEEK.map((slot) => {
    const hours = events
      .filter((event) => event.status !== "declined" && localDay(event.start) === slot.day)
      .reduce((sum, event) => sum + hoursBetween(event.start, event.end), 0)
    return {
      day: slot.day,
      label: slot.day === DEMO_TODAY ? "Fri" : slot.label,
      hours: Math.round(hours * 100) / 100,
    }
  })
}

export function dayEvents(desk: DeskState, day = desk.today): CalendarEvent[] {
  return desk.events
    .filter((event) => localDay(event.start) === day)
    .slice()
    .sort((a, b) => a.start.localeCompare(b.start))
}

export function overlaps(a: CalendarEvent, b: CalendarEvent): boolean {
  if (a.id === b.id || a.status === "declined" || b.status === "declined") return false
  return new Date(a.start) < new Date(b.end) && new Date(b.start) < new Date(a.end)
}

export function conflictIds(events: CalendarEvent[]): Set<string> {
  const ids = new Set<string>()
  for (const left of events) {
    for (const right of events) {
      if (overlaps(left, right)) {
        ids.add(left.id)
        ids.add(right.id)
      }
    }
  }
  return ids
}
