import { STANDING_ROLE, DESK_TOOLS } from "../src/lib/tools"
import type { AgentMessage } from "./session"

export type AgentToolCall = {
  id: string
  name: string
  args: string
}

export type AgentResult = {
  text: string
  tools: AgentToolCall[]
  error?: string
}

type AguiEvent = {
  type?: string
  delta?: string
  message?: string
  toolCallId?: string
  toolCallName?: string
}

export function parseAgui(raw: string): AgentResult {
  let text = ""
  const tools = new Map<string, AgentToolCall>()
  let error: string | undefined

  for (const block of raw.split("\n\n")) {
    const line = block
      .split("\n")
      .map((row) => row.trim())
      .find((row) => row.startsWith("data:"))
    if (!line) continue
    const json = line.slice("data:".length).trim()
    if (!json || json === "[DONE]") continue
    let event: AguiEvent
    try {
      event = JSON.parse(json) as AguiEvent
    } catch {
      continue
    }
    if (event.type === "TEXT_MESSAGE_CONTENT" && event.delta) text += event.delta
    if (event.type === "TOOL_CALL_START" && event.toolCallId) {
      tools.set(event.toolCallId, { id: event.toolCallId, name: event.toolCallName ?? "", args: "" })
    }
    if (event.type === "TOOL_CALL_ARGS" && event.toolCallId) {
      const existing = tools.get(event.toolCallId)
      if (existing && event.delta) existing.args += event.delta
    }
    if (event.type === "RUN_ERROR") error = event.message ?? "The Bot could not answer."
  }

  return { text, tools: [...tools.values()], error }
}

export async function callAgent(input: {
  url: string
  token: string
  threadId: string
  messages: AgentMessage[]
}): Promise<AgentResult> {
  const response = await fetch(input.url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "text/event-stream",
      "x-openbot-agent-token": input.token,
    },
    body: JSON.stringify({
      threadId: input.threadId,
      runId: crypto.randomUUID(),
      messages: input.messages,
      tools: DESK_TOOLS,
      context: [{ description: "Standing role for this desk", value: STANDING_ROLE }],
      state: {},
      forwardedProps: {},
    }),
  })
  if (!response.ok) {
    return { text: "", tools: [], error: `OpenBot agent-bot returned HTTP ${response.status}.` }
  }
  return parseAgui(await response.text())
}
