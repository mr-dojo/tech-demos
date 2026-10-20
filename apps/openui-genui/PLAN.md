# PLAN — apps/openui-genui

> Demo of **OpenUI** by Thesys (https://github.com/thesysdev/openui, MIT) — "The Open Standard for Generative UI".
> The LLM replies in **OpenUI Lang** and the client renders it live as real components instead of markdown.
>
> Themed as **Voltline PC**, a fictional computer-electronics retailer. Not a real store. No real retailer name or logo. Catalog, shopper, orders, warranties, and store stock are sample data.

## Goal (one sentence)
A single-user Next.js chat where a shopper asks Voltline to build a PC, compare parts, review orders, extend a warranty, start a return, or reserve in-store pickup, and watches OpenUI stream that answer as real UI, with a sheet for the raw OpenUI Lang.

## MVP scope (single user)
**In**
- One page: OpenUI's prebuilt `<AgentInterface />` (from `@openuidev/react-ui`) wired to the built-in `openuiLibrary` (`@openuidev/react-ui/genui-lib`).
- A light store shell: "Voltline PC" wordmark, amber accent, demo-mode badge. OpenUI still renders the generated UI.
- `POST /api/chat`: system prompt from `generateSystemPrompt({ library, promptOptions })`, Chat Completions SSE via the official `openai` SDK. The client uses `fetchLLM({ url: "/api/chat", streamAdapter: openAIAdapter(), messageFormat: openAIMessageFormat })`.
- Sample catalog (`src/data/catalog.json`, ~58 SKUs) and one sample shopper (`src/data/shopper.json`): profile, ~8 orders, warranty expirations, return windows, four fictional stores.
- Server tools. Results stay on the server. Only the final OpenUI Lang is streamed.
  - `search_parts`, `check_compatibility`, `estimate_wattage`, `price_build`
  - `get_customer_profile`, `get_order_history`, `get_warranty_status`, `quote_warranty_extension`, `start_support_request`, `check_store_stock`, `place_pickup_order`
- Builds flag parts the shopper already owns (`You own this — purchased Mar 2025`) and leave them out of the total, with a way to include or replace them.
- In-store pickup is the primary conversion. Shipping is secondary. Pickup fails when the chosen store is out of stock.
- 6 starter prompts: gaming build that reuses owned parts (product cards, summary, refine form), GPU comparison cards plus chart, order cards, warranty extension, return form plus sample RMA, pickup confirmation.
- Demo mode when `OPENAI_API_KEY` is missing (or `MOCK_LLM=1`): the same route streams canned OpenUI Lang for those starters. A visible demo-mode badge.
- A shadcn Sheet for the raw OpenUI Lang of the last reply, plus a character count.
- Light/dark theme following the system setting (`useSystemThemeMode`).

**Out (explicitly)**
- A real checkout, payment, inventory, or customer account system.
- Auth, multiple users, sharing.
- Persistent conversation storage (threads stay in memory; a refresh clears them).
- A custom component library (built-in `openuiLibrary` only).
- OpenUI Cloud / Gateway, `openui deploy`, deploys.
- LangGraph / Mastra / Vercel AI SDK (plain `openai` SDK only).
- Using a real retailer's name or logo.

## Vertical-slice tasks (each ends in something visible/working)
1. **Scaffold boots** — `apps/openui-genui/` runs at http://localhost:3000. Root and app `bunfig.toml` set `minimumReleaseAge = 259200` before the first install.
2. **shadcn ready** — preset code `b0` (nova / neutral / CSS variables). The CLI has no preset named "minimalist". Components on demand: button, sheet, badge.
3. **Catalog and shopper** — JSON sample data, priced and dated against 20 Oct 2026.
4. **Build UI** — a $1,500 1440p request streams product cards (owned cards excluded from the total), a summary card with budget and wattage charts, compatibility callouts, and a refine form. Pickup is the primary button.
5. **Comparison** — a GTX 1070 upgrade streams side-by-side GPU cards, a price-versus-performance bar chart, and a compact spec table.
6. **Shopper desk** — order cards with status steps, an expiring warranty callout with plan cards, and a prefilled return form that ends in a sample RMA. An expired plan is not extendable.
7. **Pickup** — store cards for four fictional stores, then a confirmation card (code, decorative mark, ready-by) for a store that has the parts. An out-of-stock store returns an error.
8. **Source panel** — shadcn Sheet shows the last reply's OpenUI Lang.
9. **Polish** — demo-mode badge, README, screenshot and screen recording on the PR.

## Stack (one-line rationale each)
- **Bun** (runtime + package manager): fast installs and scripts; the monorepo standard.
- **Next.js via `bunx create-next-app@latest`**: the official scaffold. OpenUI's own examples are Next.js App Router. The OpenUI CLI's default backend is LangGraph and it assumes pnpm, so create-next-app plus the OpenUI packages stays leaner.
- **`bunfig.toml` at repo root AND in `apps/openui-genui/`**, committed before any install, with `minimumReleaseAge = 259200`.
- **`@openuidev/react-ui` + `@openuidev/react-lang` + `@openuidev/lang-core`**, and **`@openuidev/cli`** for `openui generate`.
- **`openai` SDK** pointed at optional `OPENAI_BASE_URL`.
- **`zod`**: tool input schemas and a parse of the sample JSON.
- **shadcn/ui** for the Source sheet and the store-shell badge only.
- **Tailwind v4**: comes with create-next-app.

## Component / service layout
```
apps/openui-genui/
├── bunfig.toml
├── .env.example
├── PLAN.md
├── README.md
└── src/
    ├── data/
    │   ├── catalog.json          # sample SKUs
    │   └── shopper.json          # sample customer, orders, stores, stock
    ├── app/
    │   ├── layout.tsx
    │   ├── page.tsx              # server component: demoMode from env, instant = false
    │   └── api/chat/route.ts
    ├── components/
    │   ├── chat-app.tsx          # AgentInterface + Voltline header
    │   ├── source-sheet.tsx
    │   └── ui/
    ├── lib/
    │   ├── library.ts
    │   ├── prompt.ts
    │   ├── catalog.ts
    │   ├── shopper.ts
    │   ├── tools.ts              # tool schemas, compatibility, pricing, dispatch
    │   ├── builds.ts             # the sample gaming list
    │   ├── mock-lang.ts          # canned OpenUI Lang for demo mode
    │   ├── tool-loop.ts
    │   └── starters.ts
    └── generated/spec.json
```

## Env vars / API keys
- `OPENAI_API_KEY`: required for a live model. Empty (or unset) turns on demo mode.
- `OPENAI_BASE_URL`: optional.
- `OPENAI_MODEL`: optional. Default `gpt-5.2`.
- `MOCK_LLM`: `1` forces demo mode, `0` forces live mode.
- No Thesys/OpenUI Cloud key. Commit `.env.example` only.

## How to run
```bash
cd apps/openui-genui
bun install && bun run dev
# live model: cp .env.example .env.local and set OPENAI_API_KEY
```

## Minimal tests & git hooks
- `bun test`:
  - System prompt mentions catalog tools and not `get_weather`.
  - `POST /api/chat` rejects an empty `messages` array. Demo mode streams `data:` lines, product cards, and `[DONE]`. A mocked OpenAI client does the same.
  - Socket mismatch fails. An underpowered PSU fails. Owned parts are excluded from the total. Pickup fails when the store is out of stock. An expired warranty is not extendable.
  - Canned programs for the six starters parse against the generated library spec.
- `bun run typecheck` (`next typegen && tsc --noEmit`) and `bun run lint`.
- Lefthook at the repo root: pre-commit lint + typecheck, pre-push `bun test`.

## Validation / Definition of done
- `bun install && bun run dev` works from a clean clone with no API key (demo mode) and with only `OPENAI_API_KEY` set (live mode).
- Starters render product cards (owned cards called out), a build summary, a GPU chart, a refine form, order cards, a warranty quote, a return form, and a pickup confirmation, while the reply streams.
- The Source sheet shows the OpenUI Lang for the last reply.
- Tests, typecheck, and lint pass.
- The PR includes at least one screenshot and one video of the running app, covering the owned-parts build and the pickup confirmation.

## Deferred (later, not MVP)
- A custom shadcn-based OpenUI component library.
- Conversation persistence.
- OpenUI Cloud / Gateway.
- A real payment or inventory integration.
- Deploy.

## References
- Repo / README: https://github.com/thesysdev/openui
- Docs: https://www.openui.com — Playground: https://www.openui.com/playground
- Self-hosted template: https://github.com/thesysdev/openui/tree/main/templates/openui-self-hosted
- Coding-agent skill: https://raw.githubusercontent.com/thesysdev/skills/refs/heads/main/skills/openui/SKILL.md
