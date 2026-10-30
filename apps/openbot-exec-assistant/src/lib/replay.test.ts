/// <reference types="bun" />
import { describe, expect, test } from "bun:test"
import { STARTERS } from "./planner"
import { begin, buildReplay, choose, playUntilPause } from "./replay"
import recorded from "../data/replay.json"

const morning = STARTERS[0].text

describe("recorded playback", () => {
  test("pauses on the reply and approve writes the sample outbox", () => {
    const paused = playUntilPause(begin(buildReplay(morning)))
    expect(paused.pending?.tool).toBe("reply_email")
    expect(paused.desk.outbox).toHaveLength(0)
    expect(paused.timeline.some((item) => item.kind === "read")).toBe(true)
    const approved = playUntilPause(choose(paused, "approve"))
    expect(approved.desk.outbox).toHaveLength(1)
    expect(approved.pending?.tool).toBe("reschedule_event")
    expect(approved.timeline.some((item) => item.kind === "approved")).toBe(true)
  })

  test("reject leaves the mailbox and the Friday clash where they were", () => {
    const paused = playUntilPause(begin(buildReplay(morning)))
    const rejected = playUntilPause(choose(paused, "reject"))
    expect(rejected.desk.outbox).toHaveLength(0)
    expect(rejected.timeline.some((item) => item.kind === "rejected")).toBe(true)
    const austin = rejected.desk.events.find((event) => event.id === "evt-austin")
    expect(austin?.start.startsWith("2026-10-30")).toBe(true)
  })

  test("the committed recording matches the scripted morning", () => {
    const sessions = recorded.sessions as { brief: ReturnType<typeof buildReplay> }
    expect(buildReplay(morning)).toEqual(sessions.brief)
  })
})
