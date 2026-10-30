import { spawn, type Subprocess } from "bun"
import { agentRunner } from "./loop"
import { startScriptedModel } from "./scripted-openai"

const APP_ROOT = new URL("..", import.meta.url).pathname

export type DeskStack = {
  scripted: boolean
  model: string
  token: string
  agentUrl: string
  threadId: string
  run: ReturnType<typeof agentRunner>
  stop: () => void
}

async function waitFor(url: string, child?: Subprocess): Promise<void> {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    if (child && child.exitCode !== null) {
      throw new Error(`OpenBot agent-bot exited ${child.exitCode}.`)
    }
    try {
      const response = await fetch(url)
      if (response.ok) return
    } catch {
      // The process is still binding.
    }
    await Bun.sleep(100)
  }
  throw new Error(`Timed out waiting for ${url}`)
}

export async function startStack(): Promise<DeskStack> {
  const userKey = process.env.OPENAI_API_KEY?.trim() ?? ""
  const userBase = process.env.OPENAI_BASE_URL?.trim() ?? ""
  const scripted = !userKey && !userBase
  const token = crypto.randomUUID().replaceAll("-", "")
  const agentPort = Number(process.env.OPENBOT_AGENT_PORT ?? 4200)
  const scriptedPort = Number(process.env.OPENBOT_SCRIPTED_PORT ?? 4311)
  const scriptedServer = scripted ? startScriptedModel(scriptedPort) : null
  const model = scripted ? "voltline-desk" : process.env.BOT_MODEL?.trim() || "gpt-5.5"

  const child = spawn({
    cmd: [process.execPath, "vendor/openbot/agent-bot/src/index.ts"],
    cwd: APP_ROOT,
    env: {
      ...process.env,
      PORT: String(agentPort),
      MANAGED_AGENT_TOKEN: token,
      BOT_MODEL: model,
      OPENAI_BASE_URL: scripted ? `http://127.0.0.1:${scriptedPort}/v1` : userBase,
      OPENAI_API_KEY: scripted ? "" : userKey,
    },
    stdout: "inherit",
    stderr: "inherit",
  })

  const agentUrl = `http://127.0.0.1:${agentPort}/ag-ui`

  const killChild = () => {
    if (child.exitCode === null) child.kill("SIGKILL")
  }
  process.on("exit", killChild)

  try {
    await waitFor(`http://127.0.0.1:${agentPort}/health`, child)
  } catch (error) {
    killChild()
    process.off("exit", killChild)
    scriptedServer?.stop(true)
    throw error
  }

  return {
    scripted,
    model,
    token,
    agentUrl,
    threadId: "voltline-desk",
    run: agentRunner(agentUrl, token, "voltline-desk"),
    stop() {
      killChild()
      process.off("exit", killChild)
      scriptedServer?.stop(true)
    },
  }
}
