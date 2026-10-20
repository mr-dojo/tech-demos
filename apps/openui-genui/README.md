# OpenUI generative UI

A single-user chat where the model replies in [OpenUI Lang](https://github.com/thesysdev/openui) and [AgentInterface](https://www.openui.com/docs/api-reference/react-ui) renders it as live components (tables, charts, forms, cards). The **Source** sheet shows the raw language for the last reply.

The component list the model may use comes from OpenUI's built-in `openuiLibrary`. `bun run dev` regenerates `src/generated/spec.json` from `src/lib/library.ts` before the server starts. That file is committed so a fresh clone typechecks before the first generate.

## Demo mode (no API key)

If `OPENAI_API_KEY` is missing, the app sets itself to demo mode and shows a **demo mode** badge. Starter prompts still go through `POST /api/chat` and the same renderer; the route streams canned OpenUI Lang instead of calling a model. "Weather in Berlin" calls Open-Meteo (no key) and renders the live result.

`MOCK_LLM=1` forces demo mode even when a key is set. `MOCK_LLM=0` turns it off and the route returns 503 until a key is present.

## Live model

```bash
cd apps/openui-genui
cp .env.example .env.local   # set OPENAI_API_KEY
# optional: OPENAI_BASE_URL, OPENAI_MODEL (default gpt-5.2)
bun install && bun run dev   # http://localhost:3000
```

`OPENAI_BASE_URL` points the official `openai` SDK at any Chat Completions-compatible host. The server runs a tool loop (max 5 steps) for `get_weather` before the final OpenUI Lang is streamed. Tool-call chunks stay on the server: the browser adapter cannot attach a tool result, so relaying a call with no result would leave the timeline stuck.

## Scripts

| Script | What it does |
| --- | --- |
| `bun run dev` | Regenerate the library spec, then `next dev` |
| `bun test` | Prompt, route, tool-schema, and canned-language tests |
| `bun run typecheck` | `next typegen` and `tsc --noEmit` |
| `bun run lint` | ESLint |

Git hooks live at the repo root. `bun install` there installs them: pre-commit lints and typechecks staged app files, pre-push runs `bun test`.
