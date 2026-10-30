# PLAN — apps/openbot-exec-assistant

> Demo of **CopilotKit OpenBot** (https://github.com/CopilotKit/OpenBot, MIT).
> OpenBot is a self-hosted coworker platform. A Bot is any AG-UI endpoint. The built-in proof-of-concept, `agent-bot`, is an HTTP service: one `POST /ag-ui` with a `RunAgentInput`, and a stream of AG-UI events back. It publishes no tools of its own. The surface registers tools; when the Bot emits a tool call it ends the run, and the surface executes the tool and starts the next run.
>
> Pinned to commit `9ff961895603b563f21ad691ab4c41c0179cd65d` (30 Oct 2026, `agent-bot` plus the shared modules it imports). Those files are copied under `vendor/openbot/` with the MIT license. One local delta: `Bun.serve` binds `127.0.0.1`. Nothing else in that tree is edited.
>
> Themed as **Voltline PC**, the fictional retailer from the other demos. Mira Calder is the chief of staff. The person at the desk is Jun Park, CEO. Inbox, calendar, and every “send” stay inside sample data shipped in this app. No real mailbox, no calendar account, no outbound email.

## Goal (one sentence)

A single-user desk where OpenBot’s `agent-bot` reads a sample inbox and calendar, and every reply, new email, accept, decline, or reschedule stops on a card until Jun approves or rejects it, with the same screen replaying a recorded session on GitHub Pages.

## What OpenBot actually does here (researched before this design)

Checked against the clone of `main` at `9ff9618` and the docs in that tree (`README.md`, `docs/architecture.md`, `docs/coworkers.md`). Do not invent a package: the README says every workspace is private and nothing is published to depend on.

- `agent-bot` (`agent-bot/src/index.ts`) listens for `POST /ag-ui`, requires `x-openbot-agent-token` (`MANAGED_AGENT_TOKEN`), and streams chat completions through the OpenAI SDK (`stream: true`). Default model is `gpt-5.5` from `shared/model-providers.json` (`bots.agent-bot`). `BOT_MODEL` overrides it. `gpt-5.6-*` and other Responses-API models are refused at startup because this file speaks `/v1/chat/completions`.
- `OPENAI_BASE_URL` points the same client at any chat-completions server. `keyIsRequired` is false when that URL is set, so a keyless local endpoint is a supported OpenBot configuration (Ollama, vLLM, and the like).
- Tools arrive on `input.tools`. Context arrives on `input.context` and is appended as system messages after `computerGuidance` (`shared/bot-prompt.ts`). That guidance assumes a browser computer. This demo does not grant `computer_*` tools. The standing role in `context` says the only tools are the desk tools, and an unknown tool name is returned as a refusal rather than executed.
- The full product (`scripts/start.sh`) also needs Docker, PostgreSQL, and CopilotKit Intelligence (`INTELLIGENCE_API_URL`, `INTELLIGENCE_GATEWAY_WS_URL`, `INTELLIGENCE_API_KEY`). This environment has no Docker and no Intelligence project. Real mode runs `agent-bot`, not the gateway, the computer supervisor, or Intelligence. The UI says so.
- Approval in the product is a server gate (`server/src/approvals`: `allow`, `pre_approved`, `ask`, `hand_off`, fail closed). This demo does not boot that server. It copies the *ask* behaviour for outbound desk actions: the tool call is shown, nothing mutates until Approve, and Reject resumes the Bot with a refusal. Read tools run immediately and are still recorded.

## MVP scope (single user)

**In**

- One page. Voltline wordmark, Mira Calder, a mode banner that cannot be missed.
- Sample inbox and calendar for Friday 30 Oct 2026, plus the rest of that week for a meeting-hours chart.
- Live mode (`bun run dev`): spawn vendored `agent-bot` on `127.0.0.1`. The desk registers read tools (`list_inbox`, `read_email`, `list_calendar`, `read_event`) and write tools (`reply_email`, `send_email`, `accept_event`, `decline_event`, `reschedule_event`). Writes always become an approval card. Approve mutates the in-memory sample only. Reject mutates nothing.
- With `OPENAI_API_KEY` unset, `agent-bot` is pointed at an in-process chat-completions stub (`BOT_MODEL=voltline-desk`) so the real AG-UI loop still runs on the sample desk. With a key (and no `OPENAI_BASE_URL`), it uses OpenAI and `BOT_MODEL` or the OpenBot default `gpt-5.5`. The banner names which one.
- A live action timeline: read, proposed, approved, rejected, done.
- Inbox cards, a day rail, and a week chart that update after an approved change.
- Replay mode: `bun run build` (and the Pages workflow) ships a static player of a session recorded from that same loop. No server, no key. Approve and Reject still branch the recording. Banner says Replay.
- Pages base path `/tech-demos/openbot-exec-assistant/`.

**Out (explicitly)**

- Docker Compose, PostgreSQL, CopilotKit Intelligence, the computer supervisor, Chromium, MCP, Slack, or a real Gmail/Google Calendar account.
- Any network send, SMTP, or calendar API. There is no function that takes a destination host.
- Running the OpenBot product UI on port 3010.
- Editing the vendored Bot beyond the loopback bind.
- Auth, multiple users, or a hosted live API. The desk routes answer loopback only.

## Vertical-slice tasks (each ends in something visible or working)

1. **Scaffold boots** — `apps/openbot-exec-assistant/` from `bunx create-vite@latest --template react-ts --no-immediate --no-interactive`. `bunfig.toml` sets `minimumReleaseAge = 259200` before the first `bun install`.
2. **shadcn ready** — neutral base, CSS variables. The CLI has no preset named "minimalist"; use style `base-nova`. Components only as a slice needs them.
3. **Vendored Bot** — pinned `agent-bot` starts, `/health` answers, `/ag-ui` requires the token.
4. **Desk** — sample inbox and calendar. Reads return data. Writes do nothing until approved. Reject leaves the sample unchanged.
5. **Live loop** — a morning-brief prompt runs through `agent-bot` and stops on a reply card. Approve stores the reply in the sample outbox. The timeline shows each step.
6. **Replay** — the same morning, recorded, plays in the production build under the Pages base path.
7. **Polish** — README with the key variables, screenshot, and screen recording on the PR.

## Stack (one-line rationale each)

- **Bun** (runtime + package manager): monorepo standard; scripts and `bun test`. `agent-bot` is a Bun server.
- **Vite + React + TypeScript via `bunx create-vite@latest --template react-ts --no-immediate --no-interactive`**: official scaffold. The Pages artifact has to be static. Live mode is a separate Bun process, not a dependency of the static bundle.
- **`bunfig.toml` in this app**, written before the first `bun install`, with `[install] minimumReleaseAge = 259200`. The repo root already has the same file. Do not lower the age.
- **Tailwind v4**: what current shadcn installs on this Vite scaffold.
- **shadcn/ui** (style `base-nova`, base color neutral, CSS variables): the CLI has no preset named "minimalist". Components on demand: button, card, badge, scroll-area, separator, chart, textarea.
- **recharts through the shadcn chart**: meeting hours for the week, instead of a hand-rolled SVG chart.
- **`@ag-ui/core` and `@ag-ui/encoder` `0.0.57`**, and **`openai` `4.104.0`**: the versions `agent-bot`’s `package.json` declares at the pinned commit. The demo does not import CopilotKit Intelligence.

## Component / service layout

```
apps/openbot-exec-assistant/
├── bunfig.toml
├── PLAN.md
├── README.md
├── .env.example
├── vendor/openbot/                 # MIT copy of agent-bot @ 9ff9618
│   ├── PIN.json
│   ├── LICENSE
│   ├── agent-bot/src/
│   └── shared/
├── server/
│   ├── main.ts                     # loopback desk API; spawns agent-bot
│   ├── loop.ts                     # AG-UI tool loop and approval pause
│   └── scripted-openai.ts          # chat-completions stub when no key
├── scripts/dev.ts
├── src/
│   ├── data/inbox.json
│   ├── data/calendar.json
│   ├── data/replay.json            # recorded live session
│   ├── lib/                        # desk, tools, approvals, replay, week chart
│   └── components/                 # shared by live and replay
└── .gitignore
```

## Env vars / API keys

- None required for `bun install`, `bun run dev`, or the Pages build.
- `OPENAI_API_KEY`: optional. When set, and `OPENAI_BASE_URL` is unset, `agent-bot` calls OpenAI.
- `OPENAI_BASE_URL`: optional chat-completions origin. When set, OpenBot does not require a key.
- `BOT_MODEL`: optional. OpenBot’s default for this Bot is `gpt-5.5`. The keyless path sets `voltline-desk`.
- `MANAGED_AGENT_TOKEN`: generated by the desk process when it spawns the Bot. Not a user setting.
- No CopilotKit key, no Intelligence URL, no mailbox credential. Commit `.env.example` only.

## How to run

```bash
cd apps/openbot-exec-assistant
bun install && bun run dev
```

Live desk: http://127.0.0.1:5173 . The API is http://127.0.0.1:4310 and answers loopback only.

```bash
# optional live model
export OPENAI_API_KEY=...
export BOT_MODEL=gpt-5.5
bun run dev
```

Replay build (what Pages publishes):

```bash
VITE_BASE_PATH=/tech-demos/openbot-exec-assistant/ bun run build
bun run preview
```

`bun run build` is replay mode unless `VITE_LIVE=1`. `bun run dev` is always live.

## Minimal tests and checks

- `bun test`:
  - Desk: a reply does not change the outbox before approve; approve appends one sample message; reject does not; accept/decline/reschedule follow the same gate.
  - Approvals: every write tool is `ask`; every read tool is not.
  - Scripted model: the morning brief asks for the inbox, then the calendar, then a reply, and stops after the reply result.
  - Replay: playback pauses on the first proposal; approve applies the recorded mutation; reject does not.
  - Local request: loopback passes; another host or a non-loopback `X-Forwarded-For` fails.
  - One integration test spawns `agent-bot` against the stub and asserts the morning brief pauses on `reply_email` before any outbox write.
- `bun run typecheck` and `bun run lint`.
- No test calls OpenAI.

## Validation / definition of done

- `bun install && bun run dev` runs `agent-bot` against the sample desk with no key.
- Approval cards gate reply, send, accept, decline, and reschedule. The timeline shows reads, proposals, and decisions.
- The replay build loads under `/tech-demos/openbot-exec-assistant/` and does not request `/api`.
- The tracking entry moves from `proposed` to `built` with its existing fields kept.
- The PR includes at least one screenshot and one video.

## Deferred (later, not MVP)

- The OpenBot product server, Intelligence threads, and per-Bot browser computers.
- A policy file in the product’s CEL shape. This gate is the desk’s ask-before-send list.
- A real model recording checked in beside the scripted one. The committed replay is the keyless loop, labeled as such.
