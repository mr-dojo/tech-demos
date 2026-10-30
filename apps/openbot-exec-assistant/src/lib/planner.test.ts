/// <reference types="bun" />
import { describe, expect, test } from "bun:test"
import { intentOf, nextDeskStep, type TurnProgress } from "./planner"
import { rejectedContent } from "./approvals"

const brief = "Catch me up before the 9:30."

function after(progress: TurnProgress, name: string, result: string): TurnProgress {
  return { userText: progress.userText, completed: [...progress.completed, { name, result }] }
}

describe("scripted desk model", () => {
  test("the morning brief reads, then asks before a reply", () => {
    let progress: TurnProgress = { userText: brief, completed: [] }
    const inbox = nextDeskStep(progress)
    expect(inbox).toMatchObject({ type: "tool", name: "list_inbox" })
    progress = after(progress, "list_inbox", "[]")
    const calendar = nextDeskStep(progress)
    expect(calendar).toMatchObject({ type: "tool", name: "list_calendar" })
    progress = after(progress, "list_calendar", "[]")
    const reply = nextDeskStep(progress)
    expect(reply.type).toBe("tool")
    if (reply.type !== "tool") return
    expect(reply.name).toBe("reply_email")
    expect(reply.args.emailId).toBe("em-harborline")
    progress = after(progress, "reply_email", rejectedContent())
    const move = nextDeskStep(progress)
    expect(move).toMatchObject({ type: "tool", name: "reschedule_event" })
  })

  test("starter intents stay distinct", () => {
    expect(intentOf(brief)).toBe("brief")
    expect(intentOf("Reply to Harborline about the deck, and hold it for my approval.")).toBe("reply")
    expect(intentOf("The Austin walkthrough clashes with the foundry call. Propose a new time.")).toBe("clash")
    expect(intentOf("Accept the retail interview and decline the late dinner.")).toBe("rsvp")
  })
})
