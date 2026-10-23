# Codebase Atlas

A browser explorer for a [Graphify](https://github.com/Graphify-Labs/graphify) knowledge graph of **Voltline PC** (`apps/openui-genui`). Graphify parses the code locally with tree-sitter and writes a NetworkX graph. This app draws that graph. There is no vector database, and `dev` does not need Python or an API key.

The committed snapshot is real `graphify extract --code-only` output from `graphifyy` 0.9.94: 331 nodes, 683 edges, 11 communities. Docs and images were skipped because this environment had no LLM key. Communities stay numbered. Edge cards show Graphify's relation, confidence, source location, and, when `.graphify_analysis.json` recorded one, the surprise `why` string.

Search highlights a neighborhood in the browser (keyword seeds, then two undirected hops). That is a local stand-in for `graphify query`, which is a Python CLI over the same `graph.json`. `what touches the cart?` matches nothing: Voltline has no cart symbol.

## Live demo

https://mr-dojo.github.io/tech-demos/graphify-code-map/

The Pages build sets `VITE_BASE_PATH=/tech-demos/graphify-code-map/`. Local `bun run dev` leaves that unset and stays at `/`.

## Run

```bash
cd apps/graphify-code-map
bun install && bun run dev
```

## Regenerate the snapshot

Requires Python 3.10+ and the Graphify CLI (`uv tool install graphifyy==0.9.94`, or `uvx --from graphifyy==0.9.94 graphify`).

```bash
cd apps/graphify-code-map
bun run graph
```

The script runs:

```bash
graphify extract ../openui-genui --code-only --out .graphify-work
```

It copies `graph.json` into `public/` unchanged. The app fetches `graph.json` from `import.meta.env.BASE_URL` when it loads, so the snapshot stays out of the JavaScript bundle and still resolves under the Pages subpath. The script also writes a trimmed `analysis.json` (god nodes and surprises) plus `meta.json` under `src/data/`. `.graphify-work/` is gitignored.

A semantic pass over `PLAN.md` and the READMEs needs one of Graphify's documented backend keys (`graphify extract` without `--code-only`). Do not commit a key.

## Checks

```bash
bun test
bun run typecheck
bun run lint
```
