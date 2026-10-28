import { describe, expect, test } from "bun:test"
import { FEED } from "@/data/trace"
import { countDecisions, eventsFor, granted } from "@/lib/replay"

describe("replay", () => {
  test("sample cards stay labeled sample, and the proposal is the recorded one", () => {
    const proposal = FEED.filter((event) => event.phase === "proposal")
    expect(proposal).toHaveLength(1)
    expect(proposal[0]?.source).toBe("recorded")
    for (const event of FEED) {
      if (event.phase !== "proposal") expect(event.source).toBe("sample")
    }
  })

  test("pending stops on the proposal", () => {
    const visible = eventsFor(FEED, "pending")
    expect(visible.at(-1)?.id).toBe("proposal")
    expect(visible.some((event) => event.id === "post-allowed")).toBe(false)
    expect(visible.some((event) => event.id === "denied-stop")).toBe(false)
  })

  test("approve reveals the publish steps and deny does not", () => {
    const approved = eventsFor(FEED, "approved")
    const denied = eventsFor(FEED, "denied")
    expect(approved.some((event) => event.id === "post-allowed")).toBe(true)
    expect(approved.some((event) => event.id === "denied-stop")).toBe(false)
    expect(denied.some((event) => event.id === "post-allowed")).toBe(false)
    expect(denied.some((event) => event.id === "denied-stop")).toBe(true)
    expect(granted(approved).map((event) => event.id)).toContain("get-feed")
    expect(granted(approved).map((event) => event.id)).toContain("post-allowed")
    expect(granted(denied).map((event) => event.id)).not.toContain("post-allowed")
  })

  test("counts follow the visible cards", () => {
    expect(countDecisions(eventsFor(FEED, "pending"))).toEqual({
      allowed: 2,
      blocked: 3,
      flagged: 1,
    })
  })
})
