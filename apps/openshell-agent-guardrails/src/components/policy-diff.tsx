import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { ProverReport } from "@/lib/prover"
import { counterexampleLine, needsHumanApproval, proposedAddition, solverWitnessNote } from "@/lib/prover"
import type { PublishDecision } from "@/lib/reprice"

export function PolicyDiff({
  proposalYaml,
  proposal,
  credential,
  decision,
  onApprove,
  onDeny,
}: {
  proposalYaml: string
  proposal: ProverReport
  credential: ProverReport
  decision: PublishDecision
  onApprove: () => void
  onDeny: () => void
}) {
  const line = counterexampleLine(proposal)
  const witness = solverWitnessNote(proposal)
  const waiting = decision === "pending"

  return (
    <section className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-base font-medium">Policy diff</h2>
        <Badge variant="outline">Recorded</Badge>
        <Badge variant={needsHumanApproval(proposal) ? "destructive" : "secondary"}>{proposal.result}</Badge>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-pretty">
        Baseline stays inside the operator boundary. The proposal adds a POST for curl. openshell-prover 0.1.5
        reports one counterexample, and that is the flag for approval.
      </p>
      {line ? <p className="mt-3 font-mono text-sm text-pretty">{line}</p> : null}
      {witness ? <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{witness}</p> : null}

      <pre className="mt-3 max-h-36 overflow-auto rounded-lg bg-muted p-3 text-xs leading-relaxed">
        {proposedAddition(proposalYaml)}
      </pre>

      <div className="mt-3 rounded-lg border border-dashed p-3">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-medium">Credential binding, same host</p>
          <Badge variant="outline">Recorded</Badge>
          <Badge variant="destructive">{credential.result}</Badge>
        </div>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          {credential.reason} Reason code {credential.reason_code}. Only within_boundary passes, so this check fails
          closed. It is not a credential_reach_expansion finding. That gateway check did not run.
        </p>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button type="button" onClick={onApprove} disabled={!waiting}>
          Approve
        </Button>
        <Button type="button" variant="outline" onClick={onDeny} disabled={!waiting}>
          Deny
        </Button>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
        {waiting
          ? "Approve or deny continues this replay only. It does not call openshell rule approve."
          : decision === "approved"
            ? "Approved in the replay. The sandbox policy was not changed."
            : "Denied in the replay. The pricing POST stays blocked."}
      </p>
    </section>
  )
}
