import type { GraphNode, Kind } from "@/lib/types"

const FILE_LABEL = /\.(tsx?|jsx?|mjs|cjs|json|css|md)$/i

export const KIND_LABEL: Record<Kind, string> = {
  module: "Module",
  function: "Function",
  class: "Class",
  symbol: "Symbol",
  concept: "Concept",
  external: "External",
}

export const KIND_COLOR: Record<Kind, string> = {
  module: "#38bdf8",
  function: "#2dd4bf",
  class: "#fbbf24",
  symbol: "#d6d3d1",
  concept: "#c084fc",
  external: "#fb7185",
}

export function kindOf(node: GraphNode): Kind {
  if (node.external || node.type === "external") return "external"
  if (node.file_type === "concept" || node.file_type === "rationale") return "concept"
  if (FILE_LABEL.test(node.label)) return "module"
  if (node._callable_class) return "class"
  if (node._callable) return "function"
  return "symbol"
}

export function baseName(file: string): string {
  const parts = file.split("/")
  return parts[parts.length - 1] || file
}
