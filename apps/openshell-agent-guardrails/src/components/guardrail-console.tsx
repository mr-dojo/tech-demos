"use client"

import { useEffect, useMemo, useState } from "react"
import { EventCard } from "@/components/event-card"
import { GrantTimeline } from "@/components/grant-timeline"
import { PolicyDiff } from "@/components/policy-diff"
import { RepriceResult } from "@/components/reprice-result"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { FeedEvent } from "@/data/trace"
import type { ProverReport } from "@/lib/prover"
import type { Gpu, PublishDecision } from "@/lib/reprice"
import { reprice } from "@/lib/reprice"
import { countDecisions, eventsFor, granted } from "@/lib/replay"

type TraceResponse = {
  provenance: { note: string }
  policies: { proposal: string }
  reports: {
    baseline: ProverReport
    proposal: ProverReport
    credentialBinding: ProverReport
  }
  events: FeedEvent[]
  gpus: Gpu[]
}

const STEP_MS = 900

export function GuardrailConsole() {
  const [trace, setTrace] = useState<TraceResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [cursor, setCursor] = useState(0)
  const [tail, setTail] = useState(0)
  const [decision, setDecision] = useState<PublishDecision>("pending")
  const [proverNote, setProverNote] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch("/api/trace")
      .then(async (response) => {
        if (!response.ok) throw new Error(`Trace request failed (${response.status})`)
        return (await response.json()) as TraceResponse
      })
      .then((payload) => {
        if (!cancelled) setTrace(payload)
      })
      .catch((reason: unknown) => {
        if (!cancelled) setError(reason instanceof Error ? reason.message : "Could not load the trace")
      })
    return () => {
      cancelled = true
    }
  }, [])

  const head = useMemo(() => (trace ? eventsFor(trace.events, "pending") : []), [trace])
  const tailEvents = useMemo(() => {
    if (!trace || decision === "pending") return []
    return eventsFor(trace.events, decision).filter((event) => event.phase !== "before" && event.phase !== "proposal")
  }, [trace, decision])

  useEffect(() => {
    if (!trace) return
    if (cursor < head.length) {
      const timer = window.setTimeout(() => setCursor((value) => value + 1), STEP_MS)
      return () => window.clearTimeout(timer)
    }
    if (tail < tailEvents.length) {
      const timer = window.setTimeout(() => setTail((value) => value + 1), STEP_MS)
      return () => window.clearTimeout(timer)
    }
  }, [trace, cursor, head.length, tail, tailEvents.length])

  const visible = head.slice(0, cursor).concat(tailEvents.slice(0, tail))
  const proposalVisible = visible.some((event) => event.id === "proposal")
  const counts = countDecisions(visible)
  const lines = trace ? reprice(trace.gpus) : []

  function reset() {
    setCursor(0)
    setTail(0)
    setDecision("pending")
    setProverNote(null)
  }

  async function recheck() {
    setProverNote("Checking…")
    const response = await fetch("/api/prover", { method: "POST" })
    if (!response.ok) {
      setProverNote("The local prover endpoint refused the request.")
      return
    }
    const payload = (await response.json()) as {
      live: boolean
      reason?: string
      reports?: TraceResponse["reports"]
    }
    if (payload.live && payload.reports) {
      setTrace((current) => (current ? { ...current, reports: payload.reports! } : current))
      setProverNote("Replaced the cards with a live openshell-prover 0.1.5 run on this machine.")
      return
    }
    setProverNote(payload.reason ?? "Showing the recorded stdout.")
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex items-center gap-3 border-b px-4 py-3">
        <span className="voltline-mark grid size-8 shrink-0 place-items-center rounded-md text-sm font-semibold">V</span>
        <div className="min-w-0">
          <div className="font-semibold tracking-tight">Voltline PC</div>
          <div className="truncate text-xs text-muted-foreground">Store ops · one sandbox · GPU reprice</div>
        </div>
        <Badge variant="secondary" className="ml-auto shrink-0">
          Sample replay
        </Badge>
      </header>
      <div className="border-b bg-muted/60 px-4 py-2 text-xs leading-relaxed text-muted-foreground">
        {trace?.provenance.note ??
          "Policy JSON is verbatim openshell-prover 0.1.5 stdout. The activity cards are sample data."}
      </div>

      {error ? (
        <p className="p-4 text-sm text-destructive">{error}</p>
      ) : !trace ? (
        <p className="p-4 text-sm text-muted-foreground">Loading the recorded trace…</p>
      ) : (
        <div className="grid min-h-0 flex-1 gap-4 p-4 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
          <section className="flex min-h-0 flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm font-medium">Activity</h2>
              <Badge variant="outline">{counts.allowed} allowed</Badge>
              <Badge variant="outline">{counts.blocked} blocked</Badge>
              <Badge variant="outline">{counts.flagged} flagged</Badge>
              <Button type="button" variant="outline" size="sm" className="ml-auto" onClick={reset}>
                Replay
              </Button>
            </div>
            <ScrollArea className="h-[calc(100dvh-11rem)] pr-3">
              <div className="space-y-3 pb-4">
                {visible.map((event) => (
                  <EventCard key={event.id} event={event} />
                ))}
                {visible.length === 0 ? (
                  <p className="text-sm text-muted-foreground">voltline-reprice is starting.</p>
                ) : null}
              </div>
            </ScrollArea>
          </section>

          <div className="space-y-4">
            {proposalVisible ? (
              <PolicyDiff
                proposalYaml={trace.policies.proposal}
                proposal={trace.reports.proposal}
                credential={trace.reports.credentialBinding}
                decision={decision}
                onApprove={() => setDecision("approved")}
                onDeny={() => setDecision("denied")}
              />
            ) : (
              <section className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
                <h2 className="text-base font-medium">Policy diff</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  The prover card appears when the agent asks for the pricing host.
                </p>
              </section>
            )}
            <GrantTimeline events={granted(visible)} />
            {proposalVisible ? <RepriceResult lines={lines} decision={decision} /> : null}
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={recheck}>
                Re-check with local prover
              </Button>
              {proverNote ? <p className="text-xs text-muted-foreground">{proverNote}</p> : null}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
