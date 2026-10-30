import { useEffect, useRef, useState } from "react"
import { ApprovalCardView } from "@/components/approval-card"
import { ActionTimeline } from "@/components/action-timeline"
import { CalendarRail } from "@/components/calendar-rail"
import { InboxColumn } from "@/components/inbox-column"
import { ModeBanner } from "@/components/mode-banner"
import { ThemeSync } from "@/components/theme-sync"
import { WeekChart } from "@/components/week-chart"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Textarea } from "@/components/ui/textarea"
import { STARTERS } from "@/lib/planner"
import { begin, buildReplay, choose, startPlayback, step, type PlayState, type ReplayScript } from "@/lib/replay"
import recorded from "@/data/replay.json"
import { freshDesk } from "@/lib/sample"
import type { ApprovalCard, DeskMode, DeskState, TimelineItem, VisibleMessage } from "@/lib/types"

const replayBuild =
  import.meta.env.VITE_REPLAY === "1" || (import.meta.env.PROD && import.meta.env.VITE_LIVE !== "1")

const replayMode: DeskMode = {
  kind: "replay",
  title: "Replay",
  model: "recording",
  detail: "Recorded session · no server · no key · approvals are still yours",
}

function scriptFor(text: string): ReplayScript {
  const starter = STARTERS.find((item) => item.text === text)
  const sessions = recorded.sessions as Record<string, ReplayScript>
  if (starter && sessions[starter.id]) return sessions[starter.id]
  return buildReplay(text)
}

type View = {
  mode: DeskMode
  desk: DeskState
  timeline: TimelineItem[]
  messages: VisibleMessage[]
  pending: ApprovalCard | null
  error: string | null
}

async function readView(response: Response): Promise<View> {
  const payload = (await response.json()) as View & { error?: string }
  if (!response.ok) throw new Error(payload.error ?? "The desk could not answer.")
  return payload
}

export function DeskApp() {
  return (
    <>
      <ThemeSync />
      {replayBuild ? <ReplayDesk /> : <LiveDesk />}
    </>
  )
}

function LiveDesk() {
  const [view, setView] = useState<View | null>(null)
  const [busy, setBusy] = useState(true)
  const [localError, setLocalError] = useState<string | null>(null)
  const [openId, setOpenId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch("/api/session")
      .then((response) => readView(response))
      .then((next) => {
        if (!cancelled) setView(next)
      })
      .catch((error: unknown) => {
        if (!cancelled) setLocalError(error instanceof Error ? error.message : "The desk is not up.")
      })
      .finally(() => {
        if (!cancelled) setBusy(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  async function send(path: string, body: unknown) {
    setBusy(true)
    setLocalError(null)
    try {
      const response = await fetch(path, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      })
      setView(await readView(response))
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : "The desk could not answer.")
    } finally {
      setBusy(false)
    }
  }

  const desk = view?.desk ?? freshDesk()
  const mode = view?.mode ?? {
    kind: "live" as const,
    title: "Live · OpenBot",
    model: "…",
    detail: "Starting agent-bot on this machine",
  }

  return (
    <Shell
      mode={mode}
      desk={desk}
      timeline={view?.timeline ?? []}
      messages={view?.messages ?? []}
      pending={view?.pending ?? null}
      busy={busy}
      error={localError ?? view?.error ?? null}
      openId={openId}
      onOpen={setOpenId}
      onSend={(text) => send("/api/turn", { text })}
      onDecide={(decision) => send("/api/decision", { decision })}
      onReset={() => send("/api/reset", {})}
    />
  )
}

function ReplayDesk() {
  const [play, setPlay] = useState<PlayState>(() => startPlayback())
  const [armed, setArmed] = useState(false)
  const [openId, setOpenId] = useState<string | null>(null)

  useEffect(() => {
    if (!armed || play.pending || !play.cursor) return
    const timer = window.setTimeout(() => {
      setPlay((current) => (current.pending || !current.cursor ? current : step(current)))
    }, 520)
    return () => window.clearTimeout(timer)
  }, [armed, play])

  return (
    <Shell
      mode={replayMode}
      desk={play.desk}
      timeline={play.timeline}
      messages={play.messages}
      pending={play.pending}
      busy={armed && !play.pending && play.cursor !== null}
      error={null}
      openId={openId}
      onOpen={setOpenId}
      onSend={(text) => {
        setOpenId(null)
        setPlay(begin(scriptFor(text)))
        setArmed(true)
      }}
      onDecide={(decision) => setPlay((current) => choose(current, decision))}
      onReset={() => {
        setArmed(false)
        setPlay(startPlayback())
        setOpenId(null)
      }}
    />
  )
}

function Shell({
  mode,
  desk,
  timeline,
  messages,
  pending,
  busy,
  error,
  openId,
  onOpen,
  onSend,
  onDecide,
  onReset,
}: {
  mode: DeskMode
  desk: DeskState
  timeline: TimelineItem[]
  messages: VisibleMessage[]
  pending: ApprovalCard | null
  busy: boolean
  error: string | null
  openId: string | null
  onOpen: (id: string | null) => void
  onSend: (text: string) => void
  onDecide: (decision: "approve" | "reject") => void
  onReset: () => void
}) {
  const [draft, setDraft] = useState("")
  const cardRef = useRef<HTMLDivElement>(null)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" })
  }, [messages.length, pending?.id, busy])

  function submit(text: string) {
    const value = text.trim()
    if (!value || busy || pending) return
    setDraft("")
    onSend(value)
  }

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-background">
      <header className="shrink-0 border-b bg-card">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-lg bg-[oklch(0.72_0.14_70)] font-heading text-lg text-[oklch(0.25_0.04_55)]">
              V
            </span>
            <div>
              <p className="text-[0.68rem] tracking-wide text-muted-foreground uppercase">Voltline PC</p>
              <p className="font-heading text-lg leading-none">Chief of staff</p>
            </div>
          </div>
          <div className="hidden text-right sm:block">
            <p className="font-heading text-lg leading-none">{desk.coworker.name}</p>
            <p className="text-xs text-muted-foreground">
              {desk.coworker.title} to {desk.executive.name}
            </p>
          </div>
          <Button variant="outline" onClick={onReset} disabled={busy}>
            Restore sample
          </Button>
        </div>
      </header>
      <ModeBanner mode={mode} />
      <div className="grid min-h-0 flex-1 grid-cols-1 grid-rows-[minmax(0,0.7fr)_minmax(0,1.3fr)_minmax(0,0.9fr)] lg:grid-cols-[300px_minmax(0,1fr)_320px] lg:grid-rows-1">
        <ScrollArea className="h-full min-h-0 border-b lg:border-r lg:border-b-0">
          <InboxColumn desk={desk} openId={openId} onOpen={onOpen} />
        </ScrollArea>
        <section className="flex h-full min-h-0 flex-col border-b lg:border-b-0">
          <ScrollArea className="min-h-0 flex-1">
            <div className="flex flex-col gap-3 p-4">
              {messages.length === 0 ? (
                <div className="rounded-xl border border-dashed px-4 py-8">
                  <p className="font-heading text-3xl">Good morning, Jun.</p>
                  <p className="mt-2 max-w-md text-sm text-muted-foreground">
                    Mira reads the sample inbox and Friday’s calendar. A reply, a new note, or a change to the day
                    waits on a card until you approve it.
                  </p>
                </div>
              ) : null}
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={
                    message.role === "user"
                      ? "ml-8 rounded-2xl bg-primary px-3 py-2 text-sm text-primary-foreground"
                      : "mr-8 rounded-2xl bg-card px-3 py-2 text-sm ring-1 ring-foreground/10"
                  }
                >
                  <p className="text-[0.68rem] tracking-wide uppercase opacity-70">
                    {message.role === "user" ? desk.executive.name : desk.coworker.name}
                  </p>
                  <p className="mt-1 leading-relaxed whitespace-pre-wrap">{message.text}</p>
                </div>
              ))}
              {pending ? (
                <div ref={cardRef}>
                  <ApprovalCardView card={pending} busy={busy} onDecide={onDecide} />
                </div>
              ) : null}
              {busy && !pending ? <p className="text-sm text-muted-foreground">Mira is reading the sample desk…</p> : null}
              {error ? <p className="text-sm text-destructive">{error}</p> : null}
              <div ref={endRef} />
            </div>
          </ScrollArea>
          <div className="border-t p-3">
            <div className="mb-2 flex flex-wrap gap-2">
              {STARTERS.map((starter) => (
                <Button
                  key={starter.id}
                  data-testid={`starter-${starter.id}`}
                  variant="secondary"
                  size="sm"
                  disabled={busy || pending !== null}
                  onClick={() => submit(starter.text)}
                >
                  {starter.label}
                </Button>
              ))}
            </div>
            <div className="flex gap-2">
              <Textarea
                value={draft}
                placeholder="Ask Mira about the sample inbox"
                rows={2}
                disabled={busy || pending !== null}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault()
                    submit(draft)
                  }
                }}
              />
              <Button disabled={busy || pending !== null || !draft.trim()} onClick={() => submit(draft)}>
                Send
              </Button>
            </div>
          </div>
        </section>
        <ScrollArea className="h-full min-h-0 lg:border-l">
          <div className="flex flex-col gap-6 p-3">
            <ActionTimeline items={timeline} />
            <CalendarRail desk={desk} />
            <WeekChart events={desk.events} />
          </div>
        </ScrollArea>
      </div>
    </div>
  )
}
