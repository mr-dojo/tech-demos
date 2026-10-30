import { rejectedContent } from "./approvals"
import { DEMO_TODAY } from "./types"

export type CompletedTool = {
  name: string
  result: string
}

export type TurnProgress = {
  userText: string
  completed: CompletedTool[]
}

export type PlannedTool = {
  type: "tool"
  name: string
  args: Record<string, string | boolean>
  preface?: string
}

export type PlannedText = {
  type: "text"
  text: string
}

export type PlannedStep = PlannedTool | PlannedText

const HARBOR_BODY =
  "Priya — the Q3 deck will be in the Harborline folder before Thursday 9:00 CT. Page one will name the Austin slip and the Northline allocation. — Jun"

const AUSTIN_NOTE = "Moved off Friday's Northline call. Ellis still owns the floor."

export const STARTERS = [
  {
    id: "brief",
    label: "Morning brief",
    text: "Catch me up before the 9:30.",
  },
  {
    id: "reply",
    label: "Harborline reply",
    text: "Reply to Harborline about the deck, and hold it for my approval.",
  },
  {
    id: "clash",
    label: "Move Austin",
    text: "The Austin walkthrough clashes with the foundry call. Propose a new time.",
  },
  {
    id: "rsvp",
    label: "Interview and dinner",
    text: "Accept the retail interview and decline the late dinner.",
  },
] as const

export type Intent = "brief" | "reply" | "clash" | "rsvp" | "inbox"

export function intentOf(text: string): Intent {
  const value = text.toLowerCase()
  if (/catch me up|morning|9:30|9\.30|before the/.test(value)) return "brief"
  if (/austin|clash|walkthrough|reschedule|foundry call/.test(value)) return "clash"
  if (/accept|decline|interview|dinner/.test(value)) return "rsvp"
  if (/reply|harborline|deck/.test(value)) return "reply"
  return "inbox"
}

function done(progress: TurnProgress, name: string): boolean {
  return progress.completed.some((tool) => tool.name === name)
}

function wasRejected(progress: TurnProgress, name: string): boolean {
  return progress.completed.some((tool) => tool.name === name && tool.result.includes("Rejected by Jun Park"))
}

function wasApproved(progress: TurnProgress, name: string): boolean {
  return progress.completed.some((tool) => tool.name === name && tool.result.includes("Approved by Jun Park"))
}

function closing(intent: Intent, progress: TurnProgress): string {
  if (intent === "brief") {
    const parts: string[] = []
    if (wasApproved(progress, "reply_email")) parts.push("Harborline's reply is in the sample outbox.")
    if (wasRejected(progress, "reply_email")) parts.push("I did not reply to Harborline.")
    if (wasApproved(progress, "reschedule_event")) {
      parts.push("The Austin walkthrough is now Monday at 10:00 CT, off the Northline call.")
    }
    if (wasRejected(progress, "reschedule_event")) {
      parts.push("The Austin walkthrough stays at 1:15, overlapping Northline.")
    }
    parts.push("Nothing left this machine.")
    return parts.join(" ")
  }
  if (intent === "reply") {
    if (wasRejected(progress, "reply_email")) return "I did not reply to Harborline. Nothing left this machine."
    return "Harborline's reply is in the sample outbox. Nothing left this machine."
  }
  if (intent === "clash") {
    if (wasRejected(progress, "reschedule_event")) {
      return "I left the Austin walkthrough where it is. Nothing left this machine."
    }
    return "The Austin walkthrough is now Monday at 10:00 CT. Nothing left this machine."
  }
  if (intent === "rsvp") {
    const interview = wasRejected(progress, "accept_event")
      ? "The interview hold stays tentative."
      : "The retail interview is accepted."
    const dinner = wasRejected(progress, "decline_event")
      ? "Dinner with Samir stays on the calendar."
      : "Dinner with Samir is declined."
    return `${interview} ${dinner} Nothing left this machine.`
  }
  const unread = progress.completed.find((tool) => tool.name === "list_inbox")?.result ?? "[]"
  let count = 0
  try {
    const parsed = JSON.parse(unread) as unknown[]
    count = Array.isArray(parsed) ? parsed.length : 0
  } catch {
    count = 0
  }
  return `I read ${count} sample message${count === 1 ? "" : "s"}. Ask me to reply to Harborline, move the Austin clash, or answer the interview and the dinner. Nothing left this machine.`
}

export function nextDeskStep(progress: TurnProgress): PlannedStep {
  const intent = intentOf(progress.userText)

  if (intent === "brief") {
    if (!done(progress, "list_inbox")) {
      return { type: "tool", name: "list_inbox", args: { unreadOnly: true } }
    }
    if (!done(progress, "list_calendar")) {
      return { type: "tool", name: "list_calendar", args: { day: DEMO_TODAY } }
    }
    if (!done(progress, "reply_email")) {
      return {
        type: "tool",
        name: "reply_email",
        args: { emailId: "em-harborline", body: HARBOR_BODY },
        preface: "Harborline asked for the deck before Thursday. Here is the reply I would send. It waits for you.",
      }
    }
    if (!done(progress, "reschedule_event")) {
      return {
        type: "tool",
        name: "reschedule_event",
        args: {
          eventId: "evt-austin",
          start: "2026-10-26T10:00:00-05:00",
          end: "2026-10-26T10:45:00-05:00",
          note: AUSTIN_NOTE,
        },
        preface: "Friday's Austin walkthrough overlaps the Northline call. I would move it to Monday at 10:00 CT.",
      }
    }
    return { type: "text", text: closing(intent, progress) }
  }

  if (intent === "reply") {
    if (!done(progress, "read_email")) {
      return { type: "tool", name: "read_email", args: { id: "em-harborline" } }
    }
    if (!done(progress, "reply_email")) {
      return {
        type: "tool",
        name: "reply_email",
        args: { emailId: "em-harborline", body: HARBOR_BODY },
        preface: "Draft for Priya Raman. Nothing goes out until you approve it.",
      }
    }
    return { type: "text", text: closing(intent, progress) }
  }

  if (intent === "clash") {
    if (!done(progress, "list_calendar")) {
      return { type: "tool", name: "list_calendar", args: { day: DEMO_TODAY } }
    }
    if (!done(progress, "reschedule_event")) {
      return {
        type: "tool",
        name: "reschedule_event",
        args: {
          eventId: "evt-austin",
          start: "2026-10-26T10:00:00-05:00",
          end: "2026-10-26T10:45:00-05:00",
          note: AUSTIN_NOTE,
        },
        preface: "I would move the Austin walkthrough to Monday at 10:00 CT, clear of the Northline call.",
      }
    }
    return { type: "text", text: closing(intent, progress) }
  }

  if (intent === "rsvp") {
    if (!done(progress, "list_calendar")) {
      return { type: "tool", name: "list_calendar", args: { day: DEMO_TODAY } }
    }
    if (!done(progress, "accept_event")) {
      return {
        type: "tool",
        name: "accept_event",
        args: { eventId: "evt-interview" },
        preface: "The Head of Retail finalist is tentative at 11:00. I would accept that hold.",
      }
    }
    if (!done(progress, "decline_event")) {
      return {
        type: "tool",
        name: "decline_event",
        args: { eventId: "evt-dinner", note: "Taking a morning next week instead." },
        preface: "Samir offered to move dinner. I would decline tonight.",
      }
    }
    return { type: "text", text: closing(intent, progress) }
  }

  if (!done(progress, "list_inbox")) {
    return { type: "tool", name: "list_inbox", args: { unreadOnly: false } }
  }
  return { type: "text", text: closing(intent, progress) }
}

type LooseMessage = {
  role?: string
  content?: unknown
  tool_calls?: { id?: string; function?: { name?: string } }[]
  toolCalls?: { id?: string; function?: { name?: string } }[]
  tool_call_id?: string
  toolCallId?: string
}

function contentText(content: unknown): string {
  if (typeof content === "string") return content
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "string") return part
        if (part && typeof part === "object" && "text" in part && typeof part.text === "string") return part.text
        return ""
      })
      .join("")
  }
  return ""
}

export function progressFromMessages(messages: LooseMessage[]): TurnProgress {
  let lastUser = -1
  messages.forEach((message, index) => {
    if (message.role === "user") lastUser = index
  })
  const userText = lastUser >= 0 ? contentText(messages[lastUser]?.content) : ""
  const names = new Map<string, string>()
  for (const message of messages.slice(lastUser + 1)) {
    const calls = message.tool_calls ?? message.toolCalls ?? []
    for (const call of calls) {
      if (call.id && call.function?.name) names.set(call.id, call.function.name)
    }
  }
  const completed: CompletedTool[] = []
  for (const message of messages.slice(lastUser + 1)) {
    if (message.role !== "tool") continue
    const id = message.tool_call_id ?? message.toolCallId
    const name = (id && names.get(id)) || "tool"
    completed.push({ name, result: contentText(message.content) })
  }
  return { userText, completed }
}

export function rejectionResult(): string {
  return rejectedContent()
}
