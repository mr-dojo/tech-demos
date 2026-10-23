export function surpriseKey(relation: string, sourceLabel: string, targetLabel: string): string {
  return `${relation}\n${sourceLabel}\n${targetLabel}`
}

export function relationClause(relation: string, from: string, to: string): string {
  switch (relation) {
    case "calls":
      return `${from} calls ${to}`
    case "indirect_call":
      return `${from} indirectly calls ${to}`
    case "imports":
      return `${from} imports ${to}`
    case "imports_from":
      return `${from} imports from ${to}`
    case "contains":
      return `${from} contains ${to}`
    case "rationale_for":
      return `${from} records the rationale for ${to}`
    default:
      return `${from} ${relation.replaceAll("_", " ") || "connects to"} ${to}`
  }
}

export function confidenceClause(confidence: string, score?: number): string {
  if (confidence === "EXTRACTED") {
    return "Graphify extracted this directly from the source."
  }
  if (confidence === "INFERRED") {
    const scored = typeof score === "number" ? ` (score ${score})` : ""
    return `Graphify inferred this${scored}.`
  }
  if (confidence === "AMBIGUOUS") {
    return "Graphify marked this ambiguous and left it for a person to check."
  }
  return confidence ? `Graphify tagged the confidence as ${confidence}.` : "Graphify stored no confidence tag."
}

export function explainEdge(input: {
  fromLabel: string
  toLabel: string
  relation?: string
  confidence?: string
  confidenceScore?: number
  sourceFile?: string
  sourceLocation?: string
  surpriseWhy?: string
}): string {
  const relation = input.relation ?? "connects to"
  const clause = relationClause(relation, input.fromLabel, input.toLabel)
  const confidence = confidenceClause(input.confidence ?? "", input.confidenceScore)
  const place = input.sourceFile
    ? `Evidence sits at ${input.sourceFile}${input.sourceLocation ? ` ${input.sourceLocation}` : ""}.`
    : ""
  const surprise = input.surpriseWhy ? `Graphify's surprise note: ${input.surpriseWhy}` : ""
  return [`${clause}.`, confidence, place, surprise].filter(Boolean).join(" ")
}
