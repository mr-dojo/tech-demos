import { DEMO_ZONE } from "./types"

const timeFormat = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
  timeZone: DEMO_ZONE,
})

const dayFormat = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
  timeZone: DEMO_ZONE,
})

export function formatTime(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return timeFormat.format(date)
}

export function formatWhen(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return `${dayFormat.format(date)} · ${timeFormat.format(date)} CT`
}

export function formatSpan(start: string, end: string): string {
  return `${formatWhen(start)} – ${formatTime(end)} CT`
}

export function localDay(iso: string): string {
  return iso.slice(0, 10)
}

export function hoursBetween(start: string, end: string): number {
  const ms = new Date(end).getTime() - new Date(start).getTime()
  if (!Number.isFinite(ms) || ms <= 0) return 0
  return Math.round((ms / 3_600_000) * 100) / 100
}
