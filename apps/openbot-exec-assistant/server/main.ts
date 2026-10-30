import { isLocalOnlyRequest } from "../src/lib/local-request"
import type { DeskMode } from "../src/lib/types"
import { ask, blankSession, decide } from "./loop"
import type { LiveSession } from "./session"
import { startStack, type DeskStack } from "./stack"

const PORT = Number(process.env.DESK_PORT ?? 4310)

function modeOf(stack: DeskStack): DeskMode {
  return {
    kind: "live",
    title: "Live · OpenBot",
    model: stack.model,
    detail: stack.scripted
      ? "agent-bot on this machine · sample inbox · scripted model, no API key"
      : `agent-bot on this machine · sample inbox · ${stack.model}`,
  }
}

function view(session: LiveSession, stack: DeskStack) {
  return {
    mode: modeOf(stack),
    desk: session.desk,
    timeline: session.timeline,
    messages: session.visible,
    pending: session.pending?.card ?? null,
    error: session.error ?? null,
  }
}

const stack = await startStack()
let session = blankSession()
let turnLock = false

const server = Bun.serve({
  hostname: "127.0.0.1",
  port: PORT,
  async fetch(request) {
    if (!isLocalOnlyRequest(request)) {
      return Response.json({ error: "This desk answers loopback only." }, { status: 403 })
    }
    const url = new URL(request.url)
    if (request.method === "GET" && url.pathname === "/api/health") {
      return Response.json({ ok: true, ...modeOf(stack) })
    }
    if (request.method === "GET" && url.pathname === "/api/session") {
      return Response.json(view(session, stack))
    }
    if (request.method === "POST" && url.pathname === "/api/reset") {
      session = blankSession()
      return Response.json(view(session, stack))
    }
    if (request.method === "POST" && url.pathname === "/api/turn") {
      const body = (await request.json()) as { text?: string }
      const text = body.text?.trim() ?? ""
      if (!text) return Response.json({ error: "Say what you need." }, { status: 400 })
      if (session.pending) return Response.json({ error: "Decide the card that is waiting first." }, { status: 409 })
      if (turnLock) return Response.json({ error: "Mira is still on the previous step." }, { status: 409 })
      turnLock = true
      try {
        session = await ask(session, text, stack.run)
      } finally {
        turnLock = false
      }
      return Response.json(view(session, stack))
    }
    if (request.method === "POST" && url.pathname === "/api/decision") {
      const body = (await request.json()) as { decision?: string }
      if (body.decision !== "approve" && body.decision !== "reject") {
        return Response.json({ error: "Approve or reject." }, { status: 400 })
      }
      if (!session.pending) return Response.json({ error: "Nothing is waiting." }, { status: 409 })
      if (turnLock) return Response.json({ error: "Mira is still on the previous step." }, { status: 409 })
      turnLock = true
      try {
        session = await decide(session, body.decision, stack.run)
      } finally {
        turnLock = false
      }
      return Response.json(view(session, stack))
    }
    return Response.json({ error: "Not found." }, { status: 404 })
  },
})

console.info(`Voltline desk listening on http://127.0.0.1:${server.port}`)
console.info(`OpenBot agent-bot at ${stack.agentUrl} (${stack.scripted ? "scripted model" : stack.model})`)

function shutdown() {
  stack.stop()
  server.stop(true)
  process.exit(0)
}

process.on("SIGINT", shutdown)
process.on("SIGTERM", shutdown)
