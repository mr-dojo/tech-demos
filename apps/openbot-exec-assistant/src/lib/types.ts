export const DEMO_TODAY = "2026-10-30"
export const DEMO_ZONE = "America/Chicago"

export type Person = {
  name: string
  email: string
}

export type Email = {
  id: string
  from: Person
  to: string
  subject: string
  preview: string
  body: string
  receivedAt: string
  unread: boolean
  labels: string[]
}

export type OutboxItem = {
  id: string
  kind: "reply" | "new"
  emailId?: string
  to: string
  subject: string
  body: string
  savedAt: string
}

export type EventStatus = "confirmed" | "tentative" | "declined"

export type CalendarEvent = {
  id: string
  title: string
  start: string
  end: string
  location: string
  attendees: string[]
  status: EventStatus
  notes: string
}

export type DeskState = {
  today: string
  executive: { name: string; title: string; email: string }
  coworker: { name: string; title: string }
  inbox: Email[]
  outbox: OutboxItem[]
  events: CalendarEvent[]
}

export const READ_TOOLS = ["list_inbox", "read_email", "list_calendar", "read_event"] as const
export const WRITE_TOOLS = [
  "reply_email",
  "send_email",
  "accept_event",
  "decline_event",
  "reschedule_event",
] as const

export type ReadTool = (typeof READ_TOOLS)[number]
export type WriteTool = (typeof WRITE_TOOLS)[number]
export type DeskTool = ReadTool | WriteTool

export type TimelineKind = "read" | "proposed" | "approved" | "rejected" | "done"

export type TimelineItem = {
  id: string
  at: string
  kind: TimelineKind
  tool: string
  title: string
  detail: string
}

export type PreviewLine = {
  label: string
  value: string
}

export type ApprovalCard = {
  id: string
  tool: WriteTool
  title: string
  summary: string
  lines: PreviewLine[]
  args: Record<string, string>
}

export type VisibleMessage = {
  id: string
  role: "user" | "assistant"
  text: string
}

export type DeskMode = {
  kind: "live" | "replay"
  title: string
  detail: string
  model: string
}
