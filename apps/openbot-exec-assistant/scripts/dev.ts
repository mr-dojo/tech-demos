const children = [
  Bun.spawn({
    cmd: [process.execPath, "server/main.ts"],
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
    detached: true,
  }),
  Bun.spawn({
    cmd: [process.execPath, "node_modules/vite/bin/vite.js"],
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
    detached: true,
  }),
]

let stopping = false

function signalGroup(child: Bun.Subprocess, signal: NodeJS.Signals) {
  try {
    process.kill(-child.pid, signal)
  } catch {
    // The process group is already gone.
  }
  if (child.exitCode === null) {
    try {
      child.kill(signal)
    } catch {
      // The child already exited.
    }
  }
}

function shutdown() {
  if (stopping) return
  stopping = true
  for (const child of children) signalGroup(child, "SIGTERM")
  setTimeout(() => {
    for (const child of children) signalGroup(child, "SIGKILL")
  }, 400)
}

process.on("SIGINT", shutdown)
process.on("SIGTERM", shutdown)
process.on("exit", () => {
  for (const child of children) signalGroup(child, "SIGKILL")
})

const code = await Promise.race(children.map((child) => child.exited.catch(() => 1)))
shutdown()
await Promise.race([
  Promise.all(children.map((child) => child.exited.catch(() => 1))),
  Bun.sleep(700),
])
for (const child of children) signalGroup(child, "SIGKILL")
process.exit(code ?? 0)

export {}
