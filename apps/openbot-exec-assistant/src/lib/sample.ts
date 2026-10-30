import calendarJson from "../data/calendar.json"
import inboxJson from "../data/inbox.json"
import type { CalendarEvent, DeskState, Email, EventStatus, Person } from "./types"

function person(value: unknown, where: string): Person {
  if (!value || typeof value !== "object") throw new Error(`${where} is missing a person`)
  const record = value as Record<string, unknown>
  if (typeof record.name !== "string" || typeof record.email !== "string") {
    throw new Error(`${where} needs a name and email`)
  }
  return { name: record.name, email: record.email }
}

function email(value: unknown, index: number): Email {
  if (!value || typeof value !== "object") throw new Error(`inbox email ${index} is not an object`)
  const record = value as Record<string, unknown>
  const labels = record.labels
  if (typeof record.id !== "string" || typeof record.subject !== "string" || typeof record.body !== "string") {
    throw new Error(`inbox email ${index} is missing id, subject, or body`)
  }
  if (!Array.isArray(labels) || labels.some((label) => typeof label !== "string")) {
    throw new Error(`inbox email ${index} labels must be strings`)
  }
  return {
    id: record.id,
    from: person(record.from, record.id),
    to: String(record.to ?? ""),
    subject: record.subject,
    preview: String(record.preview ?? ""),
    body: record.body,
    receivedAt: String(record.receivedAt ?? ""),
    unread: Boolean(record.unread),
    labels: labels as string[],
  }
}

function status(value: unknown, id: string): EventStatus {
  if (value === "confirmed" || value === "tentative" || value === "declined") return value
  throw new Error(`${id} has an unknown status`)
}

function event(value: unknown, index: number): CalendarEvent {
  if (!value || typeof value !== "object") throw new Error(`calendar event ${index} is not an object`)
  const record = value as Record<string, unknown>
  if (typeof record.id !== "string" || typeof record.title !== "string") {
    throw new Error(`calendar event ${index} is missing id or title`)
  }
  const attendees = record.attendees
  if (!Array.isArray(attendees) || attendees.some((name) => typeof name !== "string")) {
    throw new Error(`${record.id} attendees must be strings`)
  }
  return {
    id: record.id,
    title: record.title,
    start: String(record.start ?? ""),
    end: String(record.end ?? ""),
    location: String(record.location ?? ""),
    attendees: attendees as string[],
    status: status(record.status, record.id),
    notes: String(record.notes ?? ""),
  }
}

export function freshDesk(): DeskState {
  const inbox = inboxJson as {
    today: string
    executive: { name: string; title: string; email: string }
    coworker: { name: string; title: string }
    emails: unknown[]
  }
  const calendar = calendarJson as { events: unknown[] }
  return {
    today: inbox.today,
    executive: inbox.executive,
    coworker: inbox.coworker,
    inbox: inbox.emails.map(email),
    outbox: [],
    events: calendar.events.map(event),
  }
}

export function cloneDesk(desk: DeskState): DeskState {
  return structuredClone(desk)
}
