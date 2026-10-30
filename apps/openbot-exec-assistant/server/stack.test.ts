/// <reference types="bun" />
import { describe, expect, test } from "bun:test"
import { STARTERS } from "../src/lib/planner"
import { ask, decide } from "./loop"
import { blankSession } from "./session"
import { startStack } from "./stack"

describe("OpenBot agent-bot", () => {
  test("morning brief pauses on a reply before the outbox changes", async () => {
    const previous = {
      key: process.env.OPENAI_API_KEY,
      base: process.env.OPENAI_BASE_URL,
      agent: process.env.OPENBOT_AGENT_PORT,
      scripted: process.env.OPENBOT_SCRIPTED_PORT,
    }
    process.env.OPENAI_API_KEY = ""
    process.env.OPENAI_BASE_URL = ""
    process.env.OPENBOT_AGENT_PORT = "4217"
    process.env.OPENBOT_SCRIPTED_PORT = "4317"
    const stack = await startStack()
    try {
      const health = await fetch("http://127.0.0.1:4217/health")
      expect(health.ok).toBe(true)
      const body = (await health.json()) as { model?: string }
      expect(body.model).toBe("voltline-desk")
      const paused = await ask(blankSession(), STARTERS[0].text, stack.run)
      expect(paused.error ?? "").toBe("")
      expect(paused.pending?.card.tool).toBe("reply_email")
      expect(paused.desk.outbox).toHaveLength(0)
      expect(paused.timeline.some((item) => item.tool === "list_inbox" && item.kind === "read")).toBe(true)
      const approved = await decide(paused, "approve", stack.run)
      expect(approved.desk.outbox).toHaveLength(1)
      expect(approved.desk.outbox[0]?.to).toBe("priya.raman@harborline.example")
      expect(approved.pending?.card.tool).toBe("reschedule_event")
    } finally {
      stack.stop()
      if (previous.key === undefined) delete process.env.OPENAI_API_KEY
      else process.env.OPENAI_API_KEY = previous.key
      if (previous.base === undefined) delete process.env.OPENAI_BASE_URL
      else process.env.OPENAI_BASE_URL = previous.base
      if (previous.agent === undefined) delete process.env.OPENBOT_AGENT_PORT
      else process.env.OPENBOT_AGENT_PORT = previous.agent
      if (previous.scripted === undefined) delete process.env.OPENBOT_SCRIPTED_PORT
      else process.env.OPENBOT_SCRIPTED_PORT = previous.scripted
    }
  }, 20000)
})
