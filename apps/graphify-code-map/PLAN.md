# PLAN — apps/graphify-code-map

> Demo of **Graphify** by Graphify Labs (https://github.com/Graphify-Labs/graphify, Apache-2.0).
> The PyPI package is `graphifyy`. The CLI is `graphify`.
> It turns a codebase (code, and when a model is configured, docs and media) into a local knowledge graph. Code is parsed with tree-sitter. There is no vector database.
>
> This demo maps **Voltline PC**, the OpenUI retail app in `apps/openui-genui` on branch `cursor/openui-genui-6128`. The committed snapshot is real `graphify extract --code-only` output. The running app does not need Python or an API key.

## Goal (one sentence)

A single-user explorer where someone searches and clicks through the Voltline codebase as a force-directed graph, and reads Graphify's own relation, confidence, location, and surprise `why` on every connection they open.

## What Graphify actually emits (researched before this design)

Checked against `graphifyy` 0.9.94 (`graphify --version`) and a real extract of `apps/openui-genui` on 22 Oct 2026. Docs: https://docs.graphify.com (CLI reference checked against source 0.9.x). Do not invent flags.

- Headless build: `graphify extract <path> --code-only`. Tree-sitter, no API key. `--out DIR` writes `<DIR>/graphify-out/`.
- A mixed tree without `--code-only` sends docs, PDFs, and images to a semantic backend (`GEMINI_API_KEY`, `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, and others, or `--backend`). This environment has no such key and no Ollama, so the snapshot is code-only. The run skipped 4 docs and 17 images. JSON configs (`package.json`, `tsconfig.json`, `components.json`) are classified as code and are in the graph.
- `graph.json` is NetworkX node-link JSON: `directed`, `multigraph`, `graph.schema_version`, `graph.graphify_version`, `nodes`, `links`, `hyperedges`, `built_at_commit`. Readers also accept an `edges` array.
- Node fields we will read: `id`, `label`, `norm_label`, `file_type` (`code` or `concept` in this corpus), `source_file`, `source_location` (`L<n>`), `community` (integer; names need an LLM via `graphify label` / `cluster-only` without `--no-label`), `_callable`, `_callable_class`, `external`. A semantic pass can add a `rationale` attribute (the WHY of a decision). This snapshot has none.
- Edge fields we will read: `source`, `target`, `relation` (`contains`, `calls`, `imports`, `imports_from`, `indirect_call` here), `confidence` (`EXTRACTED` | `INFERRED` | `AMBIGUOUS`), `confidence_score`, `source_file`, `source_location`, `context` (`call`, `import`, `collection`, `re-export`), `weight`.
- There is **no prose `why` string on each edge** in `graph.json`. `graphify explain "X"` is the CLI's plain-language view: label, source, community, degree, and each neighbor as `--> label [relation] [confidence] file:location`. The plain-English `why` field is on **surprising connections** in `graphify-out/.graphify_analysis.json` (`surprises[].why`), built from structural reasons (cross-community, peripheral node reaching a hub, inferred). The UI shows that `why` when the open edge is one of those surprises, and otherwise renders the edge's relation, confidence, score, and location as a sentence. That sentence is a view of stored fields, not a second invented graph.
- Real extract used for the snapshot shape: **331 nodes, 683 edges, 11 communities**, `graphify_version` `0.9.94`, `built_at_commit` of `apps/openui-genui`. About 230 KB.
- `graphify query "<question>" --graph <graph.json>` is a CLI over that file (keyword seeds, BFS depth 2 by default, `--dfs`, `--budget`, `--context`, `--seed`). It prints text. It is not a query-result document the browser can load, and `bun run dev` must not need Python. The in-app box is a local port of that neighborhood search (same idea: drop question stopwords, score labels / `norm_label` / source path / `rationale`, take the best seeds, expand 2 undirected hops). The UI says so. `graphify query "what touches the cart?"` on this corpus prints `No matching nodes found` — Voltline has no cart symbol. `pickup`, `warranty`, and `catalog` match.
- Communities stay numeric. Naming them calls a model. We will not fake names.

## MVP scope (single user)

**In**

- `bun run graph` shells out to `graphify` (or `uvx --from graphifyy graphify` when the CLI is not on `PATH`) and refreshes the committed snapshot from `../openui-genui`.
- Committed `src/data/graph.json` plus a trimmed analysis (`gods`, `surprises`) and `src/data/meta.json` (version, command, commit, code-only note). `bun install && bun run dev` needs neither Python nor a key.
- One page. A force-directed map (`react-force-graph-2d`) of the snapshot. Node size follows degree. Color follows a local kind derived from Graphify fields: module, function, class, symbol, concept, external.
- Click a node: a card with label, kind, `file_type`, source file, source location, community number, degree, and a one-line location summary. Edges of that node are cards, each with direction, the other label, relation, confidence, and the plain-language why described above.
- A search box and a few starter chips (`pickup`, `warranty`, `catalog`, `what touches the cart?`). Matches stay bright; the rest dim. Empty questions say the graph has no such node.
- A stats panel when nothing is selected: node and edge counts by kind, relation, and confidence; most-connected symbols from Graphify's god-node list; a bar chart of module coupling (cross-file edges per source file).
- shadcn cards, badges, input, and chart. Light and dark follow the system setting. The map plate stays ink-colored in both.

**Out (explicitly)**

- A live `graphify query` / `explain` process inside `bun run dev`.
- Semantic extraction of `PLAN.md`, `README.md`, images, or LLM community names. No key was available. Do not invent those nodes.
- Editing the graph, watching the repo, auth, multiple corpora, Graphify Cloud, MCP, 3D, or a vector search.
- Mapping any app other than `apps/openui-genui`.
- Treating a hand-written sample as if Graphify produced it.

## Vertical-slice tasks (each ends in something visible or working)

1. **Scaffold boots** — `apps/graphify-code-map/` from `bunx create-vite@latest --template react-ts --no-immediate --no-interactive`. `bunfig.toml` sets `minimumReleaseAge = 259200` before the first `bun install`. `bun run dev` serves a page.
2. **shadcn ready** — neutral base, CSS variables. The CLI has no preset named "minimalist"; use the neutral CSS-variable init. Components only as a slice needs them.
3. **Snapshot** — `bun run graph` writes a real Graphify JSON snapshot the app can import. README says how to regenerate and that docs were skipped.
4. **Map** — the force graph draws the snapshot. Clicking a node opens its card and edge whys.
5. **Search** — `pickup` highlights a neighborhood; `what touches the cart?` shows the empty state.
6. **Stats** — counts, hub symbols, coupling chart, visible before a node is selected.
7. **Polish** — README, screenshot, and screen recording on the PR.

## Stack (one-line rationale each)

- **Bun** (runtime + package manager): monorepo standard; scripts and `bun test`.
- **Vite + React + TypeScript via `bunx create-vite@latest --template react-ts --no-immediate`**: official scaffold. create-vite 9 calls the skip-install flag `--no-immediate`, not `--skip-install`. The explorer is a client over a static JSON file, so Next.js would add a server this demo does not need.
- **`bunfig.toml` in `apps/graphify-code-map/`**, written before the first `bun install`, with `[install] minimumReleaseAge = 259200`. The repo root already has the same file. Do not lower the age to force a newer release.
- **Tailwind v4**: what current shadcn installs on this Vite scaffold.
- **shadcn/ui preset `nova`** (style `base-nova`, base color neutral, CSS variables): the CLI has no preset named "minimalist". Nova is the neutral default. Components on demand: button, card, badge, input, chart.
- **`react-force-graph-2d`**: prebuilt React force-directed graph. Custom code only draws node color, dimming, and click handling.
- **recharts through the shadcn chart**: the coupling bars, instead of a hand-rolled SVG chart.
- **`graphifyy` CLI via `uv` or `uvx`**, invoked only by `bun run graph`: the official extractor. Not a runtime dependency of `dev`.

## Component / service layout

```
apps/graphify-code-map/
├── bunfig.toml
├── PLAN.md
├── README.md
├── scripts/graph.ts            # shells out to graphify, copies the snapshot
├── src/
│   ├── data/
│   │   ├── graph.json          # committed graphify-out/graph.json
│   │   ├── analysis.json       # gods + surprises (the why strings)
│   │   └── meta.json
│   ├── lib/
│   │   ├── types.ts
│   │   ├── model.ts            # indexes, kinds, degrees
│   │   ├── search.ts           # local keyword + 2-hop neighborhood
│   │   ├── stats.ts
│   │   ├── why.ts              # sentence from edge fields + surprise why
│   │   ├── search.test.ts
│   │   ├── stats.test.ts
│   │   └── why.test.ts
│   ├── components/
│   │   ├── ui/
│   │   ├── atlas-app.tsx
│   │   ├── graph-canvas.tsx
│   │   ├── node-card.tsx
│   │   ├── edge-card.tsx
│   │   └── stats-panel.tsx
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
└── .graphify-work/             # gitignored extractor output
```

## Env vars / API keys

- None for `bun install` or `bun run dev`.
- `bun run graph` needs Python 3.10+ and `graphify` on `PATH` (`uv tool install graphifyy`) or `uvx`.
- A semantic re-extract would need one of Graphify's documented backend keys. This plan does not require one. If a later run has a key, pass it only through the environment, never commit it.

## How to run

```bash
cd apps/graphify-code-map
bun install && bun run dev
```

Regenerate the snapshot (does not run on `dev`):

```bash
# once: uv tool install graphifyy
bun run graph
```

## Minimal tests and checks

- `bun test`:
  - Search: `pickup` seeds pickup symbols and includes a neighbor; `what touches the cart?` matches nothing; stopwords do not become seeds.
  - Why: an EXTRACTED `calls` edge renders both labels, the relation, the confidence, and the source file; a surprise edge appends Graphify's `why` string.
  - Stats: counts group by relation and kind; coupling ranks files by cross-file edges; the committed graph has `graph.graphify_version` and non-empty `nodes` and `links`.
- `bun run typecheck` (`tsc -b`) and `bun run lint`.
- Critical logic only. No pixel tests, no CLI integration test in `bun test` (that would require Python).

## Validation / definition of done

- `bun install && bun run dev` works from a clean clone with no Python and no API key.
- The map, a node card with edge whys, search highlighting, the cart empty state, and the stats chart are visible.
- Tests, typecheck, and lint pass.
- The PR includes at least one screenshot and one video of the running app, states that the graph is real Graphify `--code-only` output, and says docs were not semantically extracted.

## Deferred (later, not MVP)

- Semantic extraction of Voltline's markdown and a `rationale` attribute on nodes, once a backend key exists.
- LLM community names (`graphify label`).
- Calling `graphify query` / `explain` / `path` from a local API during dev.
- Incremental `graphify update`, watch mode, and Graphify Cloud.
- A second corpus.

## References

- Repo: https://github.com/Graphify-Labs/graphify (default branch `v8`, Apache-2.0)
- Docs: https://docs.graphify.com — extract, query, explain, outputs, headless extraction
- Package: https://pypi.org/project/graphifyy/
