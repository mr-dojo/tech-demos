import type { FeedEvent } from "@/data/trace"
import type { PublishDecision } from "@/lib/reprice"

export function eventsFor(events: FeedEvent[], decision: PublishDecision): FeedEvent[] {
  return events.filter((event) => {
    if (event.phase === "before" || event.phase === "proposal") return true
    if (decision === "approved") return event.phase === "after-approve"
    if (decision === "denied") return event.phase === "after-deny"
    return false
  })
}

export function granted(events: FeedEvent[]): FeedEvent[] {
  return events.filter((event) => event.decision === "allowed")
}

export function countDecisions(events: FeedEvent[]) {
  return {
    allowed: events.filter((event) => event.decision === "allowed").length,
    blocked: events.filter((event) => event.decision === "blocked").length,
    flagged: events.filter((event) => event.decision === "flagged").length,
  }
}
