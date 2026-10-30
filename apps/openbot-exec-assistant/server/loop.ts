import { applyDecision, applyResult, blankSession, withUser, type LiveSession } from "./session"
import { callAgent, type AgentResult } from "./agent-client"

export async function continueUntilPause(
  session: LiveSession,
  run: (session: LiveSession) => Promise<AgentResult>,
): Promise<LiveSession> {
  let current = session
  for (let guard = 0; guard < 8; guard += 1) {
    if (current.pending) return current
    const result = await run(current)
    const applied = applyResult(current, result)
    current = applied.session
    if (!applied.again) return current
  }
  const note = "Mira stopped after too many steps."
  return {
    ...current,
    error: note,
    visible: [...current.visible, { id: `m-limit`, role: "assistant", text: note }],
  }
}

export async function ask(
  session: LiveSession,
  text: string,
  run: (session: LiveSession) => Promise<AgentResult>,
): Promise<LiveSession> {
  return continueUntilPause(withUser(session, text), run)
}

export async function decide(
  session: LiveSession,
  decision: "approve" | "reject",
  run: (session: LiveSession) => Promise<AgentResult>,
): Promise<LiveSession> {
  const applied = applyDecision(session, decision)
  if (!applied.again) return applied.session
  return continueUntilPause(applied.session, run)
}

export function agentRunner(url: string, token: string, threadId: string) {
  return (session: LiveSession) => callAgent({ url, token, threadId, messages: session.messages })
}

export { blankSession }
