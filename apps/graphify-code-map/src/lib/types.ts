export type GraphNode = {
  id: string
  label: string
  norm_label?: string
  file_type?: string
  source_file?: string
  source_location?: string
  community?: number
  _callable?: boolean
  _callable_class?: boolean
  external?: boolean
  rationale?: string
  type?: string
}

export type GraphLink = {
  source: string
  target: string
  relation?: string
  confidence?: string
  confidence_score?: number
  source_file?: string
  source_location?: string
  context?: string
  weight?: number
}

export type GraphFile = {
  directed?: boolean
  multigraph?: boolean
  graph?: {
    schema_version?: number
    graphify_version?: string
  }
  nodes: GraphNode[]
  links?: GraphLink[]
  edges?: GraphLink[]
  built_at_commit?: string
}

export type Surprise = {
  source: string
  target: string
  source_files?: string[]
  confidence?: string
  relation?: string
  why: string
}

export type GodNode = {
  id: string
  label: string
  degree: number
}

export type AnalysisFile = {
  gods: GodNode[]
  surprises: Surprise[]
}

export type MetaFile = {
  graphifyVersion: string
  package: string
  command: string
  corpus: string
  builtAtCommit: string
  generatedAt: string
  semantic: boolean
  semanticNote: string
  queryMode: string
  queryNote: string
  nodeCount: number
  edgeCount: number
  communityCount: number
}

export type Kind =
  | "module"
  | "function"
  | "class"
  | "symbol"
  | "concept"
  | "external"

export type IncidentEdge = {
  index: number
  direction: "out" | "in"
  otherId: string
  link: GraphLink
}
