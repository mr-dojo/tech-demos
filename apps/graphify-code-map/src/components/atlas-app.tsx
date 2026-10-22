import { useEffect, useMemo, useState } from "react"
import { GraphCanvas } from "@/components/graph-canvas"
import { NodeCard } from "@/components/node-card"
import { StatsPanel } from "@/components/stats-panel"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { loadAtlas } from "@/data/load-atlas"
import { KIND_COLOR, KIND_LABEL } from "@/lib/kind"
import type { Atlas } from "@/lib/model"
import { searchGraph } from "@/lib/search"
import type { Kind } from "@/lib/types"

const STARTERS = [
  { label: "Pickup", query: "pickup" },
  { label: "Warranty", query: "warranty" },
  { label: "Catalog", query: "catalog" },
  { label: "Cart", query: "what touches the cart?" },
]

const KINDS: Kind[] = ["module", "function", "class", "symbol", "concept", "external"]

export function AtlasApp() {
  const [atlas, setAtlas] = useState<Atlas | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [draft, setDraft] = useState("")
  const [query, setQuery] = useState("")
  const [selectedId, setSelectedId] = useState<string | null>(null)

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)")
    const apply = () => document.documentElement.classList.toggle("dark", media.matches)
    apply()
    media.addEventListener("change", apply)
    return () => media.removeEventListener("change", apply)
  }, [])

  useEffect(() => {
    let cancelled = false
    loadAtlas()
      .then((next) => {
        if (!cancelled) setAtlas(next)
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setLoadError(error instanceof Error ? error.message : "Could not load the graph")
        }
      })
    return () => {
      cancelled = true
    }
  }, [])

  const hit = useMemo(() => (atlas ? searchGraph(query, atlas) : null), [atlas, query])
  const highlight = useMemo(() => {
    if (!hit || hit.empty) return null
    return new Set(hit.nodeIds)
  }, [hit])

  function runQuery(next: string) {
    setDraft(next)
    setQuery(next)
    setSelectedId(null)
  }

  if (!atlas) {
    return (
      <div className="flex min-h-svh flex-col bg-background">
        <header className="border-b px-4 py-3">
          <p className="text-xs tracking-[0.18em] text-muted-foreground uppercase">Graphify</p>
          <h1 className="font-heading text-3xl leading-none">Codebase Atlas</h1>
        </header>
        <div className="flex flex-1 items-center justify-center px-6">
          <p className="font-heading text-2xl text-balance">
            {loadError ?? "Loading the Voltline graph…"}
          </p>
        </div>
      </div>
    )
  }

  const shortCommit = atlas.meta.builtAtCommit.slice(0, 7)

  return (
    <div className="flex min-h-svh flex-col bg-background lg:h-svh">
      <header className="flex flex-wrap items-end justify-between gap-3 border-b px-4 py-3">
        <div>
          <p className="text-xs tracking-[0.18em] text-muted-foreground uppercase">
            Graphify {atlas.meta.graphifyVersion} · {atlas.meta.corpus}
          </p>
          <h1 className="font-heading text-3xl leading-none">Codebase Atlas</h1>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Badge variant="secondary">Code-only AST</Badge>
          <Badge variant="outline">No vector database</Badge>
          <Badge variant="outline">{shortCommit}</Badge>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[300px_minmax(0,1fr)_360px]">
        <aside className="flex flex-col gap-4 border-b p-4 lg:border-r lg:border-b-0">
          <form
            className="flex flex-col gap-2"
            onSubmit={(event) => {
              event.preventDefault()
              runQuery(draft)
            }}
          >
            <label htmlFor="atlas-query" className="text-xs tracking-[0.16em] text-muted-foreground uppercase">
              Search the graph
            </label>
            <Input
              id="atlas-query"
              value={draft}
              placeholder="pickup, warranty, catalog"
              onChange={(event) => {
                const next = event.target.value
                setDraft(next)
                setQuery(next)
              }}
            />
            <Button type="submit" className="w-full">
              Highlight neighborhood
            </Button>
          </form>

          <div className="flex flex-wrap gap-1.5">
            {STARTERS.map((starter) => (
              <Button
                key={starter.label}
                type="button"
                size="sm"
                variant={query === starter.query ? "default" : "outline"}
                onClick={() => runQuery(starter.query)}
              >
                {starter.label}
              </Button>
            ))}
          </div>

          <SearchStatus atlas={atlas} query={query} hit={hit} onOpen={setSelectedId} />

          <div>
            <p className="text-xs tracking-[0.16em] text-muted-foreground uppercase">Legend</p>
            <ul className="mt-2 grid grid-cols-2 gap-1.5">
              {KINDS.map((kind) => (
                <li key={kind} className="flex items-center gap-2 text-sm">
                  <span className="size-2.5 rounded-full" style={{ background: KIND_COLOR[kind] }} />
                  {KIND_LABEL[kind]}
                </li>
              ))}
            </ul>
          </div>

          <p className="text-xs leading-relaxed text-muted-foreground">{atlas.meta.queryNote}</p>
        </aside>

        <main className="min-h-[480px] lg:min-h-0">
          <GraphCanvas atlas={atlas} highlight={highlight} selectedId={selectedId} onSelect={setSelectedId} />
        </main>

        <aside className="min-h-0 overflow-auto border-t lg:border-t-0 lg:border-l">
          {selectedId ? (
            <NodeCard
              atlas={atlas}
              nodeId={selectedId}
              onOpen={setSelectedId}
              onClose={() => setSelectedId(null)}
            />
          ) : (
            <div>
              {hit?.empty ? (
                <div className="m-4 rounded-xl border border-dashed bg-muted/40 p-3 text-sm leading-relaxed">
                  No node in this snapshot matches those words.
                  {query.toLowerCase().includes("cart")
                    ? " Voltline has pickup, warranty, and catalog symbols, and no cart symbol."
                    : " Try a function, file, or concept Graphify extracted."}
                </div>
              ) : null}
              <StatsPanel atlas={atlas} onOpen={setSelectedId} />
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}

function SearchStatus({
  atlas,
  query,
  hit,
  onOpen,
}: {
  atlas: Atlas
  query: string
  hit: ReturnType<typeof searchGraph>
  onOpen: (id: string) => void
}) {
  if (!query.trim() || !hit) {
    return <p className="text-sm text-muted-foreground">The full map is showing. Ask about a symbol to dim the rest.</p>
  }
  if (hit.empty) {
    return <p className="text-sm">Nothing to highlight for “{query.trim()}”.</p>
  }
  return (
    <div className="space-y-2">
      <p className="text-sm leading-relaxed">
        {hit.seeds.length} seed{hit.seeds.length === 1 ? "" : "s"}, {hit.nodeIds.length} nodes in view
        {hit.truncated ? ` of ${hit.reached} reached` : ""}. Local two-hop neighborhood.
      </p>
      <div className="flex flex-col gap-1">
        {hit.seeds.map((id) => {
          const node = atlas.byId.get(id)
          if (!node) return null
          return (
            <button
              key={id}
              type="button"
              onClick={() => onOpen(id)}
              className="truncate rounded-lg bg-muted px-2 py-1.5 text-left text-sm hover:bg-muted/70"
            >
              {node.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
