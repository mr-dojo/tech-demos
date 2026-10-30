import { nextDeskStep, progressFromMessages } from "../src/lib/planner"

type LooseMessage = {
  role?: string
  content?: unknown
  tool_calls?: { id?: string; function?: { name?: string } }[]
  tool_call_id?: string
}

function chunk(delta: Record<string, unknown>, finish: string | null): string {
  return `data: ${JSON.stringify({
    id: "chatcmpl-desk",
    object: "chat.completion.chunk",
    created: 0,
    model: "voltline-desk",
    choices: [{ index: 0, delta, finish_reason: finish }],
  })}\n\n`
}

export function completionBody(messages: LooseMessage[]): string {
  const step = nextDeskStep(progressFromMessages(messages))
  let body = ""
  if (step.type === "text") {
    body += chunk({ role: "assistant", content: step.text }, null)
    body += chunk({}, "stop")
  } else {
    const id = `call_${step.name}_${messages.length}`
    body += chunk(step.preface ? { role: "assistant", content: step.preface } : { role: "assistant" }, null)
    body += chunk(
      {
        tool_calls: [
          { index: 0, id, type: "function", function: { name: step.name, arguments: "" } },
        ],
      },
      null,
    )
    body += chunk(
      { tool_calls: [{ index: 0, function: { arguments: JSON.stringify(step.args) } }] },
      null,
    )
    body += chunk({}, "tool_calls")
  }
  body += "data: [DONE]\n\n"
  return body
}

export function startScriptedModel(port: number): ReturnType<typeof Bun.serve> {
  return Bun.serve({
    hostname: "127.0.0.1",
    port,
    fetch(request) {
      const url = new URL(request.url)
      if (url.pathname === "/health") return Response.json({ status: "ok", model: "voltline-desk" })
      if (url.pathname === "/v1/chat/completions" && request.method === "POST") {
        return request.json().then((payload) => {
          const messages = (payload as { messages?: LooseMessage[] }).messages ?? []
          return new Response(completionBody(messages), {
            headers: { "content-type": "text/event-stream", "cache-control": "no-cache" },
          })
        })
      }
      return Response.json({ error: "Not found." }, { status: 404 })
    },
  })
}
