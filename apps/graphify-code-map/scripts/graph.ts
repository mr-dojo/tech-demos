import { spawnSync } from "node:child_process"
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import path from "node:path"

const appRoot = path.resolve(import.meta.dirname, "..")
const corpus = path.resolve(appRoot, "../openui-genui")
const work = path.join(appRoot, ".graphify-work")
const outDir = path.join(work, "graphify-out")

function findGraphify(): string[] {
  const home = process.env.HOME ?? ""
  const candidates = [path.join(home, ".local/bin/graphify"), "graphify"]
  for (const bin of candidates) {
    const probe = spawnSync(bin, ["--version"], { encoding: "utf8" })
    if (probe.status === 0) return [bin]
  }
  const uvxBins = ["uvx", path.join(home, ".local/bin/uvx")]
  for (const uvx of uvxBins) {
    const probe = spawnSync(uvx, ["--version"], { encoding: "utf8" })
    if (probe.status === 0) return [uvx, "--from", "graphifyy==0.9.94", "graphify"]
  }
  console.error("graphify is not on PATH. Install it with: uv tool install graphifyy==0.9.94")
  process.exit(1)
}

function run(bin: string[], args: string[]) {
  const result = spawnSync(bin[0] ?? "graphify", [...bin.slice(1), ...args], {
    encoding: "utf8",
  })
  if (result.stdout) process.stdout.write(result.stdout)
  if (result.stderr) process.stderr.write(result.stderr)
  if (result.error) {
    console.error(result.error.message)
    process.exit(1)
  }
  if (result.status !== 0) process.exit(result.status ?? 1)
}

const bin = findGraphify()
mkdirSync(work, { recursive: true })
run(bin, ["extract", corpus, "--code-only", "--out", work])

const graphPath = path.join(outDir, "graph.json")
const analysisPath = path.join(outDir, ".graphify_analysis.json")
const dataDir = path.join(appRoot, "src/data")
const publicDir = path.join(appRoot, "public")
mkdirSync(dataDir, { recursive: true })
mkdirSync(publicDir, { recursive: true })
copyFileSync(graphPath, path.join(publicDir, "graph.json"))

type AnalysisShape = {
  gods?: unknown
  surprises?: unknown
}

const analysis = JSON.parse(readFileSync(analysisPath, "utf8")) as AnalysisShape
writeFileSync(
  path.join(dataDir, "analysis.json"),
  `${JSON.stringify({ gods: analysis.gods ?? [], surprises: analysis.surprises ?? [] }, null, 2)}\n`,
)

type GraphShape = {
  graph?: { graphify_version?: string }
  nodes?: { community?: number }[]
  links?: unknown[]
  built_at_commit?: string
}

const graph = JSON.parse(readFileSync(graphPath, "utf8")) as GraphShape
const communities = new Set(
  (graph.nodes ?? []).map((node) => node.community).filter((id) => id !== undefined),
)
const meta = {
  graphifyVersion: graph.graph?.graphify_version ?? "",
  package: "graphifyy",
  command: "graphify extract ../openui-genui --code-only --out .graphify-work",
  corpus: "apps/openui-genui",
  builtAtCommit: graph.built_at_commit ?? "",
  generatedAt: new Date().toISOString(),
  semantic: false,
  semanticNote:
    "Code-only extract. No LLM API key was available, so docs and images were skipped and communities stay numbered.",
  queryMode: "local-neighborhood",
  queryNote:
    "The in-app box scores labels locally and expands two hops. It is not a live graphify query process. graphify query reads this same graph.json when you regenerate.",
  nodeCount: graph.nodes?.length ?? 0,
  edgeCount: graph.links?.length ?? 0,
  communityCount: communities.size,
}
writeFileSync(path.join(dataDir, "meta.json"), `${JSON.stringify(meta, null, 2)}\n`)
console.log(
  `Wrote snapshot: ${meta.nodeCount} nodes, ${meta.edgeCount} edges, graphify ${meta.graphifyVersion}`,
)
