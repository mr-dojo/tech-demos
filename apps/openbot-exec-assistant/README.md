# Voltline PC · Mira Calder

Mira Calder is chief of staff to Jun Park, CEO of the fictional retailer Voltline PC. She is [CopilotKit OpenBot](https://github.com/CopilotKit/OpenBot)’s built-in `agent-bot`: an AG-UI endpoint that publishes no tools of its own. This desk registers a sample inbox and calendar. OpenBot emits a tool call and stops. Reads run immediately. A reply, a new email, an accept, a decline, or a reschedule waits on a card until Jun approves or rejects it.

The mailbox and the calendar ship in this folder. Approving a reply writes the sample outbox in memory. A restart clears it. Nothing is emailed, and no calendar account is contacted.

The vendored Bot is commit `9ff961895603b563f21ad691ab4c41c0179cd65d`, with one local change: it listens on `127.0.0.1`. See `vendor/openbot/PIN.json`.

## Live demo

https://mr-dojo.github.io/tech-demos/openbot-exec-assistant/

That build is **Replay**. It plays a recorded session of the same desk with no server and no key. The banner says Replay. Approve and Reject still branch the recording.

## Run live mode

```bash
cd apps/openbot-exec-assistant
bun install && bun run dev
```

Open http://127.0.0.1:5173 . The banner says **Live · OpenBot**. A plain `curl` POST needs `Origin: http://127.0.0.1:5173` (and `Content-Type: application/json`); the desk refuses any other origin. `bun run dev` starts:

- the desk API on `127.0.0.1:4310` (loopback only)
- OpenBot `agent-bot` on `127.0.0.1:4200`
- Vite on `127.0.0.1:5173`

With `OPENAI_API_KEY` unset, `agent-bot` calls an in-process chat-completions stub (`BOT_MODEL=voltline-desk`, `OPENAI_BASE_URL` pointed at that stub). That is a supported OpenBot configuration: a named base URL does not require a key. The banner says “scripted model, no API key”.

To use a real model:

```bash
export OPENAI_API_KEY=...
export BOT_MODEL=gpt-5.5   # optional; this is OpenBot's default for agent-bot
bun run dev
```

`gpt-5.6-*` and other Responses-API models will not start. This Bot speaks `/v1/chat/completions`. `OPENAI_BASE_URL` points the same client at another chat-completions server. Do not commit a key. `.env.example` lists the variables.

This does not start the rest of OpenBot (Docker, PostgreSQL, CopilotKit Intelligence, or a browser computer). Those need credentials this demo does not use.

## Replay build

```bash
VITE_BASE_PATH=/tech-demos/openbot-exec-assistant/ bun run build
bun run preview
```

`bun run build` is replay mode unless `VITE_LIVE=1`. Preview serves the base path, so open http://127.0.0.1:4173/tech-demos/openbot-exec-assistant/ .

## Checks

```bash
bun test
bun run typecheck
bun run lint
```
