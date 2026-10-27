import auditFile from "@/data/audit.json"

export type Finding = {
  gate: string
  grade: string
  tier: string
  file: string
  line: number
  evidence: string
  fix: string
}

export type AuditFile = {
  hallmark: string
  command: string
  render: string
  summary: {
    fails: number
    reflex: number
    warns: number
    notes: number
    files: number
    render: string
  }
  findings: Finding[]
  settlements: Record<string, string>
}

export const audit = auditFile as AuditFile

const leadGates = ["54", "38iii", "85", "46a", "19", "30a", "2a", "4", "63"]

export type GateCard = {
  gate: string
  grade: string
  count: number
  evidence: string[]
  fix: string
  settlement: string
}

const gradeRank: Record<string, number> = { FAIL: 0, REFLEX: 1, WARN: 2 }

export function gateCards(source: AuditFile = audit): GateCard[] {
  const groups = new Map<string, Finding[]>()
  for (const finding of source.findings) {
    const list = groups.get(finding.gate) ?? []
    list.push(finding)
    groups.set(finding.gate, list)
  }
  return [...groups.entries()]
    .map(([gate, findings]) => {
      const ranked = [...findings].sort((a, b) => (gradeRank[a.grade] ?? 9) - (gradeRank[b.grade] ?? 9))
      const first = ranked[0]
      return {
        gate,
        grade: first?.grade ?? "WARN",
        count: findings.length,
        evidence: ranked.slice(0, 2).map((finding) => finding.evidence),
        fix: first?.fix ?? "",
        settlement: source.settlements[gate] ?? "",
      }
    })
    .sort((a, b) => {
      const ai = leadGates.indexOf(a.gate)
      const bi = leadGates.indexOf(b.gate)
      if (ai !== -1 || bi !== -1) return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
      return (gradeRank[a.grade] ?? 9) - (gradeRank[b.grade] ?? 9) || a.gate.localeCompare(b.gate)
    })
}
