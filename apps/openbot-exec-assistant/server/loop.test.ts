/// <reference types="bun" />
import { describe, expect, test } from "bun:test"
import { nextDeskStep, progressFromMessages, STARTERS } from "../src/lib/planner"
import { ask, blankSession, decide } from "./loop"
import type { AgentResult } from "./agent-client"
import type { LiveSession } from "./session"

function scripted(session: LiveSession): Promise<AgentResult> {
  const step = nextDeskStep(progressFromMessages(session.messages))
  if (step.type === "text") return Promise.resolve({ text: step.text, tools: [] })
  return Promise.resolve({
    text: step.preface ?? "",
    tools: [
      {
        id: `call-${step.name}-${session.messages.length}`,
        name: step.name,
        args: JSON.stringify(step.args),
      },
    ],
  })
}

describe("desk loop", () => {
  test("the morning brief cannot reply before approval", async () => {
    const paused = await ask(blankSession(), STARTERS[0].text, scripted)
    expect(paused.pending?.card.tool).toBe("reply_email")
    expect(paused.desk.outbox).toHaveLength(0)
    expect(paused.timeline.some((item) => item.kind === "read")).toBe(true)
    const approved = await decide(paused, "approve", scripted)
    expect(approved.desk.outbox).toHaveLength(1)
    expect(approved.pending?.card.tool).toBe("reschedule_event")
    const rejected = await decide(approved, "reject", scripted)
    expect(rejected.desk.events.find((event) => event.id === "evt-austin")?.start.startsWith("2026-10-30")).toBe(true)
    expect(rejected.desk.outbox).toHaveLength(1)
    expect(rejected.timeline.some((item) => item.kind === "rejected")).toBe(true)
    expect(rejected.pending).toBeNull()
  })
})
