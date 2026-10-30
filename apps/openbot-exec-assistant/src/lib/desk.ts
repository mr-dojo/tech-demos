import { approvedContent } from "./approvals"
import { formatSpan, formatWhen } from "./format"
import type { ApprovalCard, CalendarEvent, DeskState, Email, OutboxItem, TimelineItem, WriteTool } from "./types"

export type ToolArgs = Record<string, unknown>

export type ReadOutcome = {
  desk: DeskState
  content: string
  title: string
  detail: string
}

export type WritePreview =
  | { ok: true; card: Omit<ApprovalCard, "id"> }
  | { ok: false; content: string }

export type WriteOutcome = {
  desk: DeskState
  title: string
  detail: string
  content: string
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : ""
}

function emailById(desk: DeskState, id: string): Email | undefined {
  return desk.inbox.find((email) => email.id === id)
}

function eventById(desk: DeskState, id: string): CalendarEvent | undefined {
  return desk.events.find((event) => event.id === id)
}

function inboxSummary(emails: Email[]): string {
  return JSON.stringify(
    emails.map((email) => ({
      id: email.id,
      from: email.from.name,
      subject: email.subject,
      unread: email.unread,
      preview: email.preview,
    })),
  )
}

function eventSummary(events: CalendarEvent[]): string {
  return JSON.stringify(
    events.map((event) => ({
      id: event.id,
      title: event.title,
      start: event.start,
      end: event.end,
      status: event.status,
      location: event.location,
      notes: event.notes,
    })),
  )
}

export function performRead(desk: DeskState, tool: string, args: ToolArgs): ReadOutcome {
  if (tool === "list_inbox") {
    const unreadOnly = args.unreadOnly === true
    const emails = unreadOnly ? desk.inbox.filter((email) => email.unread) : desk.inbox
    return {
      desk,
      content: inboxSummary(emails),
      title: unreadOnly ? "Read the unread inbox" : "Read the inbox",
      detail: `${emails.length} sample message${emails.length === 1 ? "" : "s"}`,
    }
  }

  if (tool === "read_email") {
    const email = emailById(desk, text(args.id))
    if (!email) {
      return { desk, content: "No sample email with that id.", title: "Missed an email", detail: text(args.id) || "blank id" }
    }
    const next = {
      ...desk,
      inbox: desk.inbox.map((item) => (item.id === email.id ? { ...item, unread: false } : item)),
    }
    return {
      desk: next,
      content: JSON.stringify({ id: email.id, from: email.from, subject: email.subject, body: email.body }),
      title: `Read “${email.subject}”`,
      detail: email.from.name,
    }
  }

  if (tool === "list_calendar") {
    const day = text(args.day)
    const events = desk.events.filter((event) => event.start.slice(0, 10) === day)
    return {
      desk,
      content: eventSummary(events),
      title: `Read ${day || "the calendar"}`,
      detail: `${events.length} sample event${events.length === 1 ? "" : "s"}`,
    }
  }

  if (tool === "read_event") {
    const event = eventById(desk, text(args.id))
    if (!event) {
      return { desk, content: "No sample event with that id.", title: "Missed an event", detail: text(args.id) || "blank id" }
    }
    return {
      desk,
      content: eventSummary([event]),
      title: `Read “${event.title}”`,
      detail: formatSpan(event.start, event.end),
    }
  }

  return { desk, content: "That tool is not a read on this desk.", title: "Refused a tool", detail: tool }
}

function replyCard(desk: DeskState, args: ToolArgs): WritePreview {
  const email = emailById(desk, text(args.emailId))
  const body = text(args.body)
  if (!email) return { ok: false, content: "No sample email with that id, so there is nothing to reply to." }
  if (!body) return { ok: false, content: "The reply body is empty." }
  return {
    ok: true,
    card: {
      tool: "reply_email",
      title: `Reply to ${email.from.name}`,
      summary: `Reply saved to ${email.from.name} in the sample outbox.`,
      lines: [
        { label: "To", value: `${email.from.name} · ${email.from.email}` },
        { label: "Subject", value: email.subject.startsWith("Re:") ? email.subject : `Re: ${email.subject}` },
        { label: "Draft", value: body },
      ],
      args: { emailId: email.id, body },
    },
  }
}

function sendCard(args: ToolArgs): WritePreview {
  const to = text(args.to)
  const subject = text(args.subject)
  const body = text(args.body)
  if (!to || !subject || !body) return { ok: false, content: "A new email needs to, subject, and body." }
  return {
    ok: true,
    card: {
      tool: "send_email",
      title: "New email",
      summary: `New email to ${to} saved in the sample outbox.`,
      lines: [
        { label: "To", value: to },
        { label: "Subject", value: subject },
        { label: "Draft", value: body },
      ],
      args: { to, subject, body },
    },
  }
}

function acceptCard(desk: DeskState, args: ToolArgs): WritePreview {
  const event = eventById(desk, text(args.eventId))
  if (!event) return { ok: false, content: "No sample event with that id." }
  return {
    ok: true,
    card: {
      tool: "accept_event",
      title: `Accept “${event.title}”`,
      summary: `${event.title} marked accepted on the sample calendar.`,
      lines: [
        { label: "When", value: formatSpan(event.start, event.end) },
        { label: "Where", value: event.location },
        { label: "Change", value: `${event.status} → confirmed` },
      ],
      args: { eventId: event.id },
    },
  }
}

function declineCard(desk: DeskState, args: ToolArgs): WritePreview {
  const event = eventById(desk, text(args.eventId))
  if (!event) return { ok: false, content: "No sample event with that id." }
  const note = text(args.note)
  return {
    ok: true,
    card: {
      tool: "decline_event",
      title: `Decline “${event.title}”`,
      summary: `${event.title} marked declined on the sample calendar.`,
      lines: [
        { label: "When", value: formatSpan(event.start, event.end) },
        { label: "Change", value: `${event.status} → declined` },
        ...(note ? [{ label: "Note", value: note }] : []),
      ],
      args: { eventId: event.id, ...(note ? { note } : {}) },
    },
  }
}

function rescheduleCard(desk: DeskState, args: ToolArgs): WritePreview {
  const event = eventById(desk, text(args.eventId))
  const start = text(args.start)
  const end = text(args.end)
  if (!event) return { ok: false, content: "No sample event with that id." }
  if (Number.isNaN(new Date(start).getTime()) || Number.isNaN(new Date(end).getTime()) || new Date(start) >= new Date(end)) {
    return { ok: false, content: "The new start and end are not a valid range." }
  }
  const note = text(args.note)
  return {
    ok: true,
    card: {
      tool: "reschedule_event",
      title: `Move “${event.title}”`,
      summary: `${event.title} moved on the sample calendar.`,
      lines: [
        { label: "From", value: formatSpan(event.start, event.end) },
        { label: "To", value: formatSpan(start, end) },
        ...(note ? [{ label: "Note", value: note }] : []),
      ],
      args: { eventId: event.id, start, end, ...(note ? { note } : {}) },
    },
  }
}

export function previewWrite(desk: DeskState, tool: string, args: ToolArgs): WritePreview {
  if (tool === "reply_email") return replyCard(desk, args)
  if (tool === "send_email") return sendCard(args)
  if (tool === "accept_event") return acceptCard(desk, args)
  if (tool === "decline_event") return declineCard(desk, args)
  if (tool === "reschedule_event") return rescheduleCard(desk, args)
  return { ok: false, content: "That tool is not an outbound action on this desk." }
}

function nextOutboxId(desk: DeskState, stem: string): string {
  const base = `out-${stem}`
  const taken = desk.outbox.filter((item) => item.id === base || item.id.startsWith(`${base}-`)).length
  return taken === 0 ? base : `${base}-${taken + 1}`
}

export function performWrite(desk: DeskState, tool: WriteTool, args: ToolArgs, savedAt: string): WriteOutcome {
  const preview = previewWrite(desk, tool, args)
  if (!preview.ok) {
    return { desk, title: "Did not change the desk", detail: preview.content, content: preview.content }
  }

  if (tool === "reply_email") {
    const email = emailById(desk, preview.card.args.emailId ?? "")
    if (!email) return { desk, title: "Did not change the desk", detail: "Missing email", content: "Missing email" }
    const item: OutboxItem = {
      id: nextOutboxId(desk, email.id),
      kind: "reply",
      emailId: email.id,
      to: email.from.email,
      subject: email.subject.startsWith("Re:") ? email.subject : `Re: ${email.subject}`,
      body: preview.card.args.body ?? "",
      savedAt,
    }
    return {
      desk: {
        ...desk,
        outbox: [...desk.outbox, item],
        inbox: desk.inbox.map((row) => (row.id === email.id ? { ...row, unread: false } : row)),
      },
      title: `Saved a reply to ${email.from.name}`,
      detail: "Sample outbox only",
      content: approvedContent(preview.card.summary),
    }
  }

  if (tool === "send_email") {
    const item: OutboxItem = {
      id: nextOutboxId(desk, "new"),
      kind: "new",
      to: preview.card.args.to ?? "",
      subject: preview.card.args.subject ?? "",
      body: preview.card.args.body ?? "",
      savedAt,
    }
    return {
      desk: { ...desk, outbox: [...desk.outbox, item] },
      title: `Saved a new email to ${item.to}`,
      detail: "Sample outbox only",
      content: approvedContent(preview.card.summary),
    }
  }

  if (tool === "accept_event" || tool === "decline_event") {
    const eventId = preview.card.args.eventId ?? ""
    const nextStatus = tool === "accept_event" ? "confirmed" : "declined"
    const event = eventById(desk, eventId)
    const note = preview.card.args.note
    return {
      desk: {
        ...desk,
        events: desk.events.map((row) =>
          row.id === eventId
            ? { ...row, status: nextStatus, notes: note ? `${row.notes} ${note}`.trim() : row.notes }
            : row,
        ),
      },
      title: tool === "accept_event" ? `Accepted “${event?.title ?? eventId}”` : `Declined “${event?.title ?? eventId}”`,
      detail: "Sample calendar only",
      content: approvedContent(preview.card.summary),
    }
  }

  const eventId = preview.card.args.eventId ?? ""
  const event = eventById(desk, eventId)
  const note = preview.card.args.note
  return {
    desk: {
      ...desk,
      events: desk.events.map((row) =>
        row.id === eventId
          ? {
              ...row,
              start: preview.card.args.start ?? row.start,
              end: preview.card.args.end ?? row.end,
              status: "confirmed",
              notes: note ? `${row.notes} ${note}`.trim() : row.notes,
            }
          : row,
      ),
    },
    title: `Moved “${event?.title ?? eventId}”`,
    detail: formatWhen(preview.card.args.start ?? ""),
    content: approvedContent(preview.card.summary),
  }
}

export function timelineItem(
  partial: Omit<TimelineItem, "id" | "at"> & { id: string; at: string },
): TimelineItem {
  return partial
}
