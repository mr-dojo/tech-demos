/// <reference types="bun" />
import { describe, expect, test } from "bun:test"
import { gateFor } from "./approvals"
import { performWrite, previewWrite } from "./desk"
import { freshDesk } from "./sample"
import { READ_TOOLS, WRITE_TOOLS } from "./types"

describe("approval gate", () => {
  test("reads run and outbound actions ask", () => {
    for (const tool of READ_TOOLS) expect(gateFor(tool)).toBe("allow")
    for (const tool of WRITE_TOOLS) expect(gateFor(tool)).toBe("ask")
    expect(gateFor("computer_navigate")).toBe("refuse")
  })
})

describe("sample desk", () => {
  test("a reply stays out of the outbox until it is performed", () => {
    const desk = freshDesk()
    const preview = previewWrite(desk, "reply_email", {
      emailId: "em-harborline",
      body: "The deck is coming.",
    })
    expect(preview.ok).toBe(true)
    expect(desk.outbox).toHaveLength(0)
    if (!preview.ok) return
    const saved = performWrite(desk, preview.card.tool, preview.card.args, "2026-10-30T14:00:00.000Z")
    expect(saved.desk.outbox).toHaveLength(1)
    expect(saved.desk.outbox[0]?.to).toBe("priya.raman@harborline.example")
    expect(saved.content.includes("Approved by Jun Park")).toBe(true)
    expect(desk.outbox).toHaveLength(0)
  })

  test("accept, decline, and reschedule change only the sample calendar", () => {
    const desk = freshDesk()
    const accepted = performWrite(desk, "accept_event", { eventId: "evt-interview" }, "2026-10-30T14:00:00.000Z")
    expect(accepted.desk.events.find((event) => event.id === "evt-interview")?.status).toBe("confirmed")
    const declined = performWrite(accepted.desk, "decline_event", { eventId: "evt-dinner", note: "Morning instead." }, "2026-10-30T14:01:00.000Z")
    expect(declined.desk.events.find((event) => event.id === "evt-dinner")?.status).toBe("declined")
    const moved = performWrite(declined.desk, "reschedule_event", {
      eventId: "evt-austin",
      start: "2026-10-26T10:00:00-05:00",
      end: "2026-10-26T10:45:00-05:00",
    }, "2026-10-30T14:02:00.000Z")
    expect(moved.desk.events.find((event) => event.id === "evt-austin")?.start.startsWith("2026-10-26")).toBe(true)
    expect(desk.events.find((event) => event.id === "evt-austin")?.start.startsWith("2026-10-30")).toBe(true)
  })

  test("a missing email is not an approval card", () => {
    const preview = previewWrite(freshDesk(), "send_email", { to: "", subject: "Hi", body: "Hi" })
    expect(preview.ok).toBe(false)
  })
})
