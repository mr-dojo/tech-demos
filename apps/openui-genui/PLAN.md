# PLAN — apps/openui-genui

> Demo of **OpenUI** by Thesys (https://github.com/thesysdev/openui, MIT) — "The Open Standard for Generative UI".
> The LLM replies in **OpenUI Lang** (a compact, streaming-first UI language) and the client renders it live as real components (cards, tables, charts, forms) instead of markdown.

## Goal (one sentence)
A single-user Next.js chat app where you ask for something ("compare 3 laptops", "build me a signup form", "show a sales dashboard") and watch OpenUI stream it in as real interactive UI, with a toggle to see the raw OpenUI Lang that produced it.

## MVP scope (single user)
**In**
- One page: OpenUI's prebuilt `<AgentInterface />` (from `@openuidev/react-ui`) wired to the built-in `openuiLibrary` component library (`@openuidev/react-ui/genui-lib`).
- `POST /api/chat`: a Next.js route that builds the system prompt with `generateSystemPrompt({ library, promptOptions })` from `@openuidev/lang-core` and streams Chat Completions SSE from any OpenAI-compatible provider (official `openai` SDK). The client parses it with `fetchLLM({ url: "/api/chat", streamAdapter: openAIAdapter(), messageFormat: openAIMessageFormat })`.
- 4–6 starter prompts that each show off a different component family (table, chart, form, card grid, multi-step layout).
- A shadcn/ui "Source" panel (Sheet or Tabs) that shows the raw OpenUI Lang text of the latest assistant message, plus a rough character/token count — this is the "how it works" moment of the demo.
- One app-owned tool (e.g. `get_weather` via Open-Meteo, no key) to show tool call → generated UI, copied from the OpenUI self-hosted template pattern.
- Light/dark theme following the system setting (`useSystemThemeMode`).

**Out (explicitly)**
- Auth, accounts, multiple users, sharing.
- Persistent conversation storage (threads stay in memory; a refresh clears them).
- A custom component library (we use OpenUI's built-in one; no porting of the 45-component shadcn example).
- OpenUI Cloud / Gateway, `openui deploy`, Vercel deploys, observability-cloud.
- LangGraph / Mastra / Vercel AI SDK agent frameworks (plain `openai` SDK only).
- Vue/Svelte/Angular runtimes, React Native, email rendering, A2UI.
- Benchmarking OpenUI Lang against JSON formats.

## Vertical-slice tasks (each ends in something visible/working)
1. **Scaffold boots** — the app runs at http://localhost:3000 under `apps/openui-genui/` with an install that respects `minimumReleaseAge` (root + app `bunfig.toml` committed *before* the first `bun install`).
2. **shadcn ready** — `bunx shadcn@latest init` with the minimalist preset (neutral base color, CSS variables); no components yet beyond what slices need.
3. **First generated UI** — typing "show a table of 3 planets with mass and moons" streams back and renders as an OpenUI table inside `<AgentInterface />`.
4. **Library-driven prompt** — `openui generate src/lib/library.ts --spec --out src/generated/spec.json` runs as `predev`/`prebuild`; the route reads the spec and builds the prompt, so the components the model may use come only from the library.
5. **Starters** — welcome screen shows 4–6 starter cards; clicking each one produces a different kind of UI.
6. **Tool → UI** — asking "weather in Berlin" calls `get_weather` server-side (tool loop, max 5 steps) and the answer renders as a card/chart.
7. **Source panel** — a shadcn `Sheet` (added with `bunx shadcn@latest add sheet button badge`) shows the raw OpenUI Lang of the last reply + character count.
8. **Polish + validation assets** — empty/error states (missing key → clear banner), README, screenshot + screen recording captured for the PR.

## Stack (one-line rationale each)
- **Bun** (runtime + package manager): fast installs and scripts; the monorepo standard.
- **Next.js via `bunx create-next-app@latest apps/openui-genui --ts --tailwind --eslint --app --src-dir --import-alias "@/*" --use-bun --skip-install`**: the official scaffold; OpenUI's own templates/examples are Next.js App Router, so docs and examples map 1:1. (Alternative noted: `bunx @openuidev/cli@latest create --name openui-genui --no-install --no-interactive`. Its default backend is LangGraph and it assumes pnpm, so plain create-next-app plus the OpenUI packages is leaner.)
- **`bunfig.toml` at repo root AND in `apps/openui-genui/`**, created before any install:
  ```toml
  [install]
  minimumReleaseAge = 259200  # 3 days, in seconds
  ```
  Supply-chain guard. Note: `@openuidev/react-lang`/`lang-core` 1.0.1 and `react-ui`/`react-headless` 0.18.1 were published 2026-10-15 ~00:25 ET, and `@openuidev/cli` 0.6.0 on 2026-10-15 ~07:09 ET, so all clear the 3-day window as of 2026-10-19. If a newer patch ships, Bun should resolve back to the newest version that clears the window; do not override it.
- **`@openuidev/react-ui` + `@openuidev/react-lang` + `@openuidev/lang-core`** (runtime deps), **`@openuidev/cli`** (devDep, for `openui generate`): the library itself, so we get prebuilt chat, streaming renderer, prompt generation and component library and write as little custom code as possible.
- **`openai` SDK** pointed at `OPENAI_BASE_URL`: works with any OpenAI-compatible provider, which is the self-hosted path OpenUI documents.
- **`zod`**: needed by the OpenUI libraries and used for the tool input schema.
- **shadcn/ui (minimalist preset, components added on demand)**: for the app shell around AgentInterface only (Source sheet, header buttons/badges); OpenUI renders the generated UI itself.
- **Tailwind v4**: comes with create-next-app and is what shadcn expects.

## Component / service layout
```
apps/openui-genui/
├── bunfig.toml
├── .env.example              # OPENAI_API_KEY=, OPENAI_BASE_URL=, OPENAI_MODEL=
├── PLAN.md
├── README.md
├── package.json              # scripts: generate, predev, dev, prebuild, build, start, lint, test, typecheck
├── components.json           # shadcn
└── src/
    ├── app/
    │   ├── layout.tsx        # theme + fonts
    │   ├── page.tsx          # "use client": <AgentInterface llm componentLibrary=openuiLibrary starters> + SourceSheet trigger
    │   └── api/chat/route.ts # validate body → system prompt → openai stream → tool loop → SSE "data: …\n\n" + [DONE]
    ├── components/
    │   ├── source-sheet.tsx  # shadcn Sheet showing raw OpenUI Lang + char count
    │   └── ui/               # shadcn-generated primitives only (sheet, button, badge)
    ├── lib/
    │   ├── library.ts        # re-export openuiLibrary as `library` + openuiPromptOptions as `promptOptions` (input to `openui generate`)
    │   ├── prompt.ts         # loads generated/spec.json → generateSystemPrompt({ library, promptOptions })
    │   ├── tools.ts          # get_weather declaration + executor (Open-Meteo, no key)
    │   ├── tool-loop.ts      # small Chat Completions tool loop (max 5 steps), streams chunks
    │   ├── env.ts            # requiredEnv() + defaults
    │   └── starters.ts       # starter prompts
    └── generated/spec.json   # produced by `openui generate` — do not hand edit (gitignored, or committed with a header note)
```

## Env vars / API keys
- `OPENAI_API_KEY`: **required**. Any OpenAI-compatible provider key.
- `OPENAI_BASE_URL`: optional (defaults to OpenAI). Lets you point at another compatible provider.
- `OPENAI_MODEL`: optional; default set in `env.ts` (e.g. `gpt-5.2`, the default in the OpenUI self-hosted template).
- No Thesys/OpenUI Cloud key needed (`THESYS_API_KEY` only applies to the Cloud path, which is out of scope).
- Commit `.env.example` only; `.env.local` is gitignored.

## How to run
```bash
cd apps/openui-genui
cp .env.example .env.local   # fill OPENAI_API_KEY
bun install && bun run dev   # predev runs `openui generate`; open http://localhost:3000
```

## Minimal tests & git hooks
- `bun test` (Bun's built-in test runner):
  - `prompt.test.ts`: the system prompt builds from spec.json and mentions at least one known component name.
  - `route.test.ts`: `POST /api/chat` with an empty `messages` array returns 400; with a mocked OpenAI client it streams lines that start with `data:` and ends with `[DONE]`.
  - `tools.test.ts`: the get_weather executor's input schema rejects an empty location.
- `bun run typecheck` (`tsc --noEmit`) and `bun run lint`.
- Git hooks via **lefthook** (or simple-git-hooks, whichever the monorepo standardizes on): `pre-commit` runs lint + typecheck on staged app files; `pre-push` runs `bun test`. Never bypass with `--no-verify`.

## Validation / Definition of done
- `bun install && bun run dev` works from a clean clone with only `OPENAI_API_KEY` set.
- At least 3 starter prompts render real components (table, chart, form) while the reply is still streaming.
- The Source sheet shows the OpenUI Lang for the last reply.
- Tests, typecheck and lint pass.
- **The PR must include at least one screenshot AND one video (screen recording) of the running app**, e.g. one screenshot of a generated dashboard and one ~20–40s recording of a prompt streaming into UI and the Source sheet opening.

## Deferred (later, not MVP)
- A custom shadcn-based OpenUI component library (port of `examples/design-systems/shadcn`).
- Conversation persistence (pass a storage implementation to AgentInterface, backed by SQLite via `bun:sqlite`).
- An OpenUI Cloud/Gateway mode toggle (`THESYS_API_KEY`).
- Side-by-side token comparison of OpenUI Lang vs JSON for the same UI.
- `@openuidev/devtools` inspector widget.
- Deploy.

## References
- Repo / README: https://github.com/thesysdev/openui
- Docs: https://www.openui.com — Playground: https://www.openui.com/playground
- Self-hosted template (pattern source): https://github.com/thesysdev/openui/tree/main/templates/openui-self-hosted
- shadcn example: https://github.com/thesysdev/openui/tree/main/examples/design-systems/shadcn
- Coding-agent skill: https://raw.githubusercontent.com/thesysdev/skills/refs/heads/main/skills/openui/SKILL.md
