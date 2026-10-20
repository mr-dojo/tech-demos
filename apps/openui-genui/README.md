# Voltline PC

A sample shopper chat for a fictional computer store. The model replies in [OpenUI Lang](https://github.com/thesysdev/openui) and [AgentInterface](https://www.openui.com/docs/api-reference/react-ui) renders it as live components: product cards, a build summary with a budget bar and a wattage gauge, a GPU comparison chart, a refine form, order cards, a warranty callout with plan cards, a return form, and an in-store pickup confirmation. The **Source** sheet shows the raw language for the last reply.

Voltline PC is not a real retailer. `src/data/catalog.json` is about 58 made-up SKUs and prices. `src/data/shopper.json` is one sample customer (Alex Rivera), eight past orders, and four fictional stores. Warranty and return dates are computed from a fixed sample today of **20 Oct 2026**.

The component list the model may use comes from OpenUI's built-in `openuiLibrary`. `bun run dev` regenerates `src/generated/spec.json` from `src/lib/library.ts` before the server starts. That file is committed so a fresh clone typechecks before the first generate.

## Demo mode (no API key)

If `OPENAI_API_KEY` is missing, the app sets itself to demo mode and shows a **demo mode** badge. Starter prompts still go through `POST /api/chat` and the same renderer. The route streams canned OpenUI Lang built from the sample catalog and the sample shopper, instead of calling a model.

`MOCK_LLM=1` forces demo mode even when a key is set. `MOCK_LLM=0` turns it off and the route returns 503 until a key is present.

## Live model

```bash
cd apps/openui-genui
cp .env.example .env.local   # set OPENAI_API_KEY
# optional: OPENAI_BASE_URL, OPENAI_MODEL (default gpt-5.2)
bun install && bun run dev   # http://localhost:3000
```

`OPENAI_BASE_URL` points the official `openai` SDK at any Chat Completions-compatible host. The server runs a tool loop (max 5 steps) before the final OpenUI Lang is streamed. Tool-call chunks stay on the server: the browser adapter cannot attach a tool result, so relaying a call with no result would leave the timeline stuck.

`POST /api/chat` has no authentication and no rate limiting. Add both before any public deploy that uses a real `OPENAI_API_KEY`. As it stands, anyone who can reach the route can spend that key.

Tools, all backed by the sample JSON:

| Tool | What it returns |
| --- | --- |
| `search_parts` | Catalog rows for one category |
| `check_compatibility` | Socket, RAM type, PSU headroom, GPU length, cooler height |
| `estimate_wattage` | CPU + GPU sample TDP, plus platform overhead |
| `price_build` | Line prices. Parts the shopper already owns are left out of the total unless `includeOwned` is true |
| `get_customer_profile` | Alex Rivera and the parts they own |
| `get_order_history` | Orders, pickup vs shipped, warranty, return window |
| `get_warranty_status` / `quote_warranty_extension` | Plan state and mock extension prices. An expired plan cannot be extended |
| `start_support_request` | A sample RMA. A return fails after the window closes |
| `check_store_stock` | Stock at the four Voltline stores |
| `place_pickup_order` | A pickup code, or an error when the store is missing a part |

In-store pickup is the primary call to action on a build. Shipping is the secondary button.

## Scripts

| Script | What it does |
| --- | --- |
| `bun run dev` | Regenerate the library spec, then `next dev` |
| `bun test` | Prompt, route, catalog rules, and canned-language tests |
| `bun run typecheck` | `next typegen` and `tsc --noEmit` |
| `bun run lint` | ESLint |

Git hooks live at the repo root. `bun install` there installs them: pre-commit lints and typechecks staged app files, pre-push runs `bun test`.
