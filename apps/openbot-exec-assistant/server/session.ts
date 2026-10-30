import { gateFor, isWriteTool, rejectedContent } from "../src/lib/approvals"
import { performRead, performWrite, previewWrite, type ToolArgs } from "../src/lib/desk"
import { freshDesk } from "../src/lib/sample"
import type { AgentResult, AgentToolCall } from "./agent-client"
import type { ApprovalCard, DeskState, TimelineItem, VisibleMessage } from "../src/lib/types"

export type AgentMessage =
  | { id: string; role: "user"; content: string }
  | {
      id: string
      role: "assistant"
      content?: string
      toolCalls?: {
        id: string
        type: "function"
        function: { name: string; arguments: string }
      }[]
    }
  | { id: string; role: "tool"; content: string; toolCallId: string }

export type PendingAction = {
  card: ApprovalCard
  toolCallId: string
  rest: AgentToolCall[]
}

export type LiveSession = {
  desk: DeskState
  timeline: TimelineItem[]
  messages: AgentMessage[]
  visible: VisibleMessage[]
  pending: PendingAction | null
  error?: string
  seq: number
}

export function blankSession(): LiveSession {
  return {
    desk: freshDesk(),
    timeline: [],
    messages: [],
    visible: [],
    pending: null,
    seq: 0,
  }
}

function atNow(): string {
  return new Date().toISOString()
}

function withSeq(session: LiveSession): { session: LiveSession; n: number } {
  const n = session.seq + 1
  return { session: { ...session, seq: n }, n }
}

function appendTool(session: LiveSession, toolCallId: string, content: string): LiveSession {
  const { session: next, n } = withSeq(session)
  return {
    ...next,
    messages: [...next.messages, { id: `m-${n}`, role: "tool", content, toolCallId }],
  }
}

function addTimeline(session: LiveSession, item: Omit<TimelineItem, "id" | "at">): LiveSession {
  const { session: next, n } = withSeq(session)
  return {
    ...next,
    timeline: [...next.timeline, { ...item, id: `tl-${n}`, at: atNow() }],
  }
}

function parseArgs(raw: string): ToolArgs {
  try {
    const parsed = JSON.parse(raw || "{}") as unknown
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed as ToolArgs
    return {}
  } catch {
    return {}
  }
}

export function withUser(session: LiveSession, text: string): LiveSession {
  const { session: next, n } = withSeq(session)
  return {
    ...next,
    error: undefined,
    messages: [...next.messages, { id: `m-${n}`, role: "user", content: text }],
    visible: [...next.visible, { id: `m-${n}`, role: "user", text }],
  }
}

export function drain(session: LiveSession, tools: AgentToolCall[]): { session: LiveSession; again: boolean } {
  if (tools.length === 0) return { session, again: true }
  const [head, ...rest] = tools
  if (!head) return { session, again: true }
  const args = parseArgs(head.args)
  const gate = gateFor(head.name)

  if (gate === "refuse") {
    const noted = addTimeline(session, {
      kind: "rejected",
      tool: head.name,
      title: "Refused a tool that is not on this desk",
      detail: head.name,
    })
    return drain(appendTool(noted, head.id, `That tool is not granted on this desk (${head.name}).`), rest)
  }

  if (gate === "allow") {
    const outcome = performRead(session.desk, head.name, args)
    const noted = addTimeline({ ...session, desk: outcome.desk }, {
      kind: "read",
      tool: head.name,
      title: outcome.title,
      detail: outcome.detail,
    })
    return drain(appendTool(noted, head.id, outcome.content), rest)
  }

  const preview = previewWrite(session.desk, head.name, args)
  if (!preview.ok || !isWriteTool(head.name)) {
    const content = preview.ok ? "That action is not on this desk." : preview.content
    return drain(appendTool(session, head.id, content), rest)
  }

  const noted = addTimeline(session, {
    kind: "proposed",
    tool: head.name,
    title: preview.card.title,
    detail: "Waiting for Jun",
  })
  return {
    session: {
      ...noted,
      pending: {
        card: { id: `card-${head.id}`, ...preview.card },
        toolCallId: head.id,
        rest,
      },
    },
    again: false,
  }
}

export function applyResult(session: LiveSession, result: AgentResult): { session: LiveSession; again: boolean } {
  if (result.error) {
    const { session: next, n } = withSeq(session)
    return {
      session: {
        ...next,
        error: result.error,
        visible: [...next.visible, { id: `m-${n}`, role: "assistant", text: result.error }],
      },
      again: false,
    }
  }

  let current = session
  if (result.text.trim()) {
    const stepped = withSeq(current)
    current = {
      ...stepped.session,
      visible: [...stepped.session.visible, { id: `m-${stepped.n}`, role: "assistant", text: result.text.trim() }],
    }
  }

  if (result.tools.length === 0) {
    return {
      session: addTimeline(current, {
        kind: "done",
        tool: "mira",
        title: "Finished this pass",
        detail: "Sample desk only",
      }),
      again: false,
    }
  }

  const stepped = withSeq(current)
  current = {
    ...stepped.session,
    messages: [
      ...stepped.session.messages,
      {
        id: `m-${stepped.n}`,
        role: "assistant",
        content: result.text,
        toolCalls: result.tools.map((tool) => ({
          id: tool.id,
          type: "function" as const,
          function: { name: tool.name, arguments: tool.args || "{}" },
        })),
      },
    ],
  }
  return drain(current, result.tools)
}

export function applyDecision(
  session: LiveSession,
  decision: "approve" | "reject",
): { session: LiveSession; again: boolean } {
  const pending = session.pending
  if (!pending) return { session, again: false }

  if (decision === "approve") {
    const outcome = performWrite(session.desk, pending.card.tool, pending.card.args, atNow())
    const noted = addTimeline({ ...session, desk: outcome.desk, pending: null }, {
      kind: "approved",
      tool: pending.card.tool,
      title: outcome.title,
      detail: outcome.detail,
    })
    return drain(appendTool(noted, pending.toolCallId, outcome.content), pending.rest)
  }

  const noted = addTimeline({ ...session, pending: null }, {
    kind: "rejected",
    tool: pending.card.tool,
    title: `Rejected “${pending.card.title}”`,
    detail: "Nothing changed",
  })
  return drain(appendTool(noted, pending.toolCallId, rejectedContent()), pending.rest)
}
