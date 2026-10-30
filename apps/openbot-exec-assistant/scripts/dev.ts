const server = Bun.spawn(["bun", "server/main.ts"], {
  stdin: "inherit",
  stdout: "inherit",
  stderr: "inherit",
})

const vite = Bun.spawn(["bun", "node_modules/vite/bin/vite.js"], {
  stdin: "inherit",
  stdout: "inherit",
  stderr: "inherit",
})

function shutdown() {
  server.kill()
  vite.kill()
}

process.on("SIGINT", shutdown)
process.on("SIGTERM", shutdown)

const code = await Promise.race([server.exited, vite.exited])
shutdown()
process.exit(code ?? 0)

export {}
