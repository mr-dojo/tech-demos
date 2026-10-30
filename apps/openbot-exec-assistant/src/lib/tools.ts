import type { DeskTool } from "./types"

export const STANDING_ROLE = `You are Mira Calder, Chief of Staff to Jun Park, CEO of Voltline PC.
Voltline is fictional. The inbox and calendar in your tools are sample data shipped with this desk.
Today is Friday 30 October 2026. Times are America/Chicago.

This run does not include a browser or a computer. The only tools you may call are the desk tools named in this request. Do not call computer_navigate or any other computer_* tool.

Read with list_inbox, read_email, list_calendar, and read_event.
A reply, a new email, an accept, a decline, or a reschedule must be a tool call. Jun approves or rejects it. Never say you sent, accepted, declined, or rescheduled something unless the tool result says Jun approved it.
If Jun rejects an action, do not retry it.
Nothing leaves this machine.`

type ToolSpec = {
  name: DeskTool
  description: string
  parameters: Record<string, unknown>
}

const object = (properties: Record<string, unknown>, required: string[]): Record<string, unknown> => ({
  type: "object",
  properties,
  required,
  additionalProperties: false,
})

export const DESK_TOOLS: ToolSpec[] = [
  {
    name: "list_inbox",
    description: "List messages in Jun's sample inbox. Does not send mail.",
    parameters: object(
      { unreadOnly: { type: "boolean", description: "When true, return unread messages only." } },
      [],
    ),
  },
  {
    name: "read_email",
    description: "Read one sample email by id, including the body.",
    parameters: object({ id: { type: "string" } }, ["id"]),
  },
  {
    name: "list_calendar",
    description: "List sample calendar events on a calendar day, YYYY-MM-DD.",
    parameters: object({ day: { type: "string", description: "Calendar day, YYYY-MM-DD." } }, ["day"]),
  },
  {
    name: "read_event",
    description: "Read one sample calendar event by id.",
    parameters: object({ id: { type: "string" } }, ["id"]),
  },
  {
    name: "reply_email",
    description: "Propose a reply. Jun must approve it. It is saved in the sample outbox and is not emailed.",
    parameters: object({ emailId: { type: "string" }, body: { type: "string" } }, ["emailId", "body"]),
  },
  {
    name: "send_email",
    description: "Propose a new email. Jun must approve it. It is saved in the sample outbox and is not emailed.",
    parameters: object(
      { to: { type: "string" }, subject: { type: "string" }, body: { type: "string" } },
      ["to", "subject", "body"],
    ),
  },
  {
    name: "accept_event",
    description: "Propose accepting a sample calendar event. Jun must approve it. No external calendar is updated.",
    parameters: object({ eventId: { type: "string" } }, ["eventId"]),
  },
  {
    name: "decline_event",
    description: "Propose declining a sample calendar event. Jun must approve it. No external calendar is updated.",
    parameters: object(
      { eventId: { type: "string" }, note: { type: "string" } },
      ["eventId"],
    ),
  },
  {
    name: "reschedule_event",
    description: "Propose a new start and end for a sample event. Jun must approve it. No external calendar is updated.",
    parameters: object(
      {
        eventId: { type: "string" },
        start: { type: "string", description: "ISO-8601 start with offset." },
        end: { type: "string", description: "ISO-8601 end with offset." },
        note: { type: "string" },
      },
      ["eventId", "start", "end"],
    ),
  },
]

export function toolByName(name: string): ToolSpec | undefined {
  return DESK_TOOLS.find((tool) => tool.name === name)
}
