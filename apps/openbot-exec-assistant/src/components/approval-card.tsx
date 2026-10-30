import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import type { ApprovalCard } from "@/lib/types"

export function ApprovalCardView({
  card,
  busy,
  onDecide,
}: {
  card: ApprovalCard
  busy: boolean
  onDecide: (decision: "approve" | "reject") => void
}) {
  return (
    <Card data-testid="approval-card" className="border-amber-700/30 bg-[oklch(0.98_0.03_90)] ring-amber-700/20">
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <Badge variant="outline">Waiting for you</Badge>
          <span className="text-xs tracking-wide text-muted-foreground uppercase">Approve before anything changes</span>
        </div>
        <CardTitle className="font-heading text-2xl">{card.title}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3">
        {card.lines.map((line) => (
          <div key={line.label} className="rounded-lg bg-background/80 px-3 py-2">
            <p className="text-[0.68rem] tracking-wide text-muted-foreground uppercase">{line.label}</p>
            <p className="mt-1 text-sm leading-relaxed whitespace-pre-wrap">{line.value}</p>
          </div>
        ))}
      </CardContent>
      <CardFooter className="justify-end gap-2">
        <Button data-testid="reject" variant="outline" disabled={busy} onClick={() => onDecide("reject")}>
          Reject
        </Button>
        <Button data-testid="approve" disabled={busy} onClick={() => onDecide("approve")}>
          Approve
        </Button>
      </CardFooter>
    </Card>
  )
}
