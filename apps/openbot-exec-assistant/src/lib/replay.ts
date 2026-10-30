import { gateFor, isWriteTool, rejectedContent } from "./approvals"
import { performRead, performWrite, previewWrite, type ToolArgs } from "./desk"
import { nextDeskStep, type TurnProgress } from "./planner"
import { freshDesk } from "./sample"
import type { ApprovalCard, DeskState, TimelineItem, VisibleMessage, WriteTool } from "./types"

export type ReplayNode =
  | { kind: "user"; text: string; next: ReplayNode | null }
  | { kind: "assistant"; text: string; done?: boolean; next: ReplayNode | null }
  | {
      kind: "read"
      tool: string
      args: ToolArgs
      next: ReplayNode | null
    }
  | {
      kind: "proposal"
      id: string
      tool: WriteTool
      args: Record<string, string>
      title: string
      summary: string
      lines: ApprovalCard["lines"]
      approve: ReplayNode | null
      reject: ReplayNode | null
    }
  | {
      kind: "effect"
      decision: "approve" | "reject"
      tool: string
      args: Record<string, string>
      title: string
      detail: string
      next: ReplayNode | null
    }

export type ReplayScript = {
  prompt: string
  recordedFrom: string
  agentCommit: string
  root: ReplayNode
}

export type PlayState = {
  desk: DeskState
  timeline: TimelineItem[]
  messages: VisibleMessage[]
  pending: ApprovalCard | null
  cursor: ReplayNode | null
  seq: number
}

const RECORDED_FROM = "OpenBot agent-bot tool loop against the voltline-desk model and the sample mailbox"
const AGENT_COMMIT = "9ff961895603b563f21ad691ab4c41c0179cd65d"
const BASE_MS = Date.parse("2026-10-30T13:40:00.000Z")

function stamp(seq: number): string {
  return new Date(BASE_MS + seq * 60_000).toISOString()
}

function walk(desk: DeskState, progress: TurnProgress): ReplayNode | null {
  const step = nextDeskStep(progress)
  if (step.type === "text") {
    return { kind: "assistant", text: step.text, done: true, next: null }
  }

  if (gateFor(step.name) === "allow") {
    const outcome = performRead(desk, step.name, step.args)
    const next: ReplayNode = {
      kind: "read",
      tool: step.name,
      args: step.args,
      next: walk(outcome.desk, {
        userText: progress.userText,
        completed: [...progress.completed, { name: step.name, result: outcome.content }],
      }),
    }
    if (!step.preface) return next
    return { kind: "assistant", text: step.preface, next }
  }

  const preview = previewWrite(desk, step.name, step.args)
  if (!preview.ok || !isWriteTool(step.name)) {
    return {
      kind: "assistant",
      text: preview.ok ? "That action is not on this desk." : preview.content,
      done: true,
      next: null,
    }
  }

  const approved = performWrite(desk, preview.card.tool, preview.card.args, stamp(progress.completed.length + 1))
  const proposal: ReplayNode = {
    kind: "proposal",
    id: `proposal-${step.name}-${progress.completed.length}`,
    tool: preview.card.tool,
    args: preview.card.args,
    title: preview.card.title,
    summary: preview.card.summary,
    lines: preview.card.lines,
    approve: {
      kind: "effect",
      decision: "approve",
      tool: step.name,
      args: preview.card.args,
      title: approved.title,
      detail: approved.detail,
      next: walk(approved.desk, {
        userText: progress.userText,
        completed: [...progress.completed, { name: step.name, result: approved.content }],
      }),
    },
    reject: {
      kind: "effect",
      decision: "reject",
      tool: step.name,
      args: preview.card.args,
      title: `Rejected “${preview.card.title}”`,
      detail: "Nothing changed",
      next: walk(desk, {
        userText: progress.userText,
        completed: [...progress.completed, { name: step.name, result: rejectedContent() }],
      }),
    },
  }
  if (!step.preface) return proposal
  return { kind: "assistant", text: step.preface, next: proposal }
}

export function buildReplay(prompt: string): ReplayScript {
  return {
    prompt,
    recordedFrom: RECORDED_FROM,
    agentCommit: AGENT_COMMIT,
    root: {
      kind: "user",
      text: prompt,
      next: walk(freshDesk(), { userText: prompt, completed: [] }),
    },
  }
}

export function startPlayback(): PlayState {
  return {
    desk: freshDesk(),
    timeline: [],
    messages: [],
    pending: null,
    cursor: null,
    seq: 0,
  }
}

export function begin(script: ReplayScript): PlayState {
  return { ...startPlayback(), cursor: script.root }
}

export function step(state: PlayState): PlayState {
  const node = state.cursor
  if (!node || state.pending) return state
  const seq = state.seq + 1
  const at = stamp(seq)

  if (node.kind === "user") {
    return {
      ...state,
      seq,
      messages: [...state.messages, { id: `m-${seq}`, role: "user", text: node.text }],
      cursor: node.next,
    }
  }

  if (node.kind === "assistant") {
    const timeline = node.done
      ? [
          ...state.timeline,
          {
            id: `tl-${seq}`,
            at,
            kind: "done" as const,
            tool: "mira",
            title: "Finished this pass",
            detail: "Sample desk only",
          },
        ]
      : state.timeline
    return {
      ...state,
      seq,
      timeline,
      messages: [...state.messages, { id: `m-${seq}`, role: "assistant", text: node.text }],
      cursor: node.next,
    }
  }

  if (node.kind === "read") {
    const outcome = performRead(state.desk, node.tool, node.args)
    return {
      ...state,
      seq,
      desk: outcome.desk,
      timeline: [
        ...state.timeline,
        { id: `tl-${seq}`, at, kind: "read", tool: node.tool, title: outcome.title, detail: outcome.detail },
      ],
      cursor: node.next,
    }
  }

  if (node.kind === "effect") {
    if (node.decision === "approve" && isWriteTool(node.tool)) {
      const outcome = performWrite(state.desk, node.tool, node.args, at)
      return {
        ...state,
        seq,
        desk: outcome.desk,
        timeline: [
          ...state.timeline,
          { id: `tl-${seq}`, at, kind: "approved", tool: node.tool, title: outcome.title, detail: outcome.detail },
        ],
        cursor: node.next,
      }
    }
    return {
      ...state,
      seq,
      timeline: [
        ...state.timeline,
        { id: `tl-${seq}`, at, kind: "rejected", tool: node.tool, title: node.title, detail: node.detail },
      ],
      cursor: node.next,
    }
  }

  return {
    ...state,
    seq,
    pending: {
      id: node.id,
      tool: node.tool,
      title: node.title,
      summary: node.summary,
      lines: node.lines,
      args: node.args,
    },
    timeline: [
      ...state.timeline,
      { id: `tl-${seq}`, at, kind: "proposed", tool: node.tool, title: node.title, detail: "Waiting for Jun" },
    ],
    cursor: node,
  }
}

export function playUntilPause(state: PlayState): PlayState {
  let current = state
  for (let guard = 0; guard < 24; guard += 1) {
    if (!current.cursor || current.pending) return current
    const next = step(current)
    if (next === current) return current
    current = next
  }
  return current
}

export function choose(state: PlayState, decision: "approve" | "reject"): PlayState {
  if (state.cursor?.kind !== "proposal" || !state.pending) return state
  const branch = decision === "approve" ? state.cursor.approve : state.cursor.reject
  return { ...state, pending: null, cursor: branch }
}
