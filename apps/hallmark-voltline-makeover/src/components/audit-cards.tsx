import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { audit, gateCards } from "@/lib/audit"

const tone: Record<string, "destructive" | "secondary" | "outline"> = {
  FAIL: "destructive",
  REFLEX: "secondary",
  WARN: "outline",
}

export function AuditCards() {
  const cards = gateCards()
  return (
    <section data-testid="audit-cards" className="grid gap-4">
      <div className="grid gap-1">
        <h2 className="text-xl font-medium tracking-tight">What the audit flagged</h2>
        <p className="max-w-3xl text-sm text-muted-foreground">
          {audit.summary.fails} FAIL, {audit.summary.reflex} REFLEX, and {audit.summary.warns} WARN
          from <span className="font-medium text-foreground">{audit.command}</span>. The render tier{" "}
          {audit.render}. Each card quotes the linter, then says how that gate was settled on the
          redesigned pages.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <Card key={card.gate} data-testid={`audit-card-${card.gate}`} size="sm">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Badge variant={tone[card.grade] ?? "outline"}>{card.grade}</Badge>
                <CardTitle>Gate {card.gate}</CardTitle>
                {card.count > 1 ? (
                  <span className="text-xs text-muted-foreground">{card.count} hits</span>
                ) : null}
              </div>
              <CardDescription className="text-foreground">{card.evidence[0]}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-2">
              {card.evidence[1] ? (
                <p className="text-xs text-muted-foreground">{card.evidence[1]}</p>
              ) : null}
              <p className="text-sm">{card.settlement}</p>
              <p className="text-xs text-muted-foreground">Hallmark's fix line: {card.fix}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  )
}
