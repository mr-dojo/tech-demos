import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatWhen } from "@/lib/format"
import type { DeskState } from "@/lib/types"

export function InboxColumn({
  desk,
  openId,
  onOpen,
}: {
  desk: DeskState
  openId: string | null
  onOpen: (id: string | null) => void
}) {
  const unread = desk.inbox.filter((email) => email.unread).length
  return (
    <div className="flex flex-col gap-3 p-3">
      <div>
        <p className="text-[0.68rem] tracking-wide text-muted-foreground uppercase">Sample inbox</p>
        <h2 className="font-heading text-xl">Jun’s mail</h2>
        <p className="text-xs text-muted-foreground">{unread} unread · nothing here can be emailed</p>
      </div>
      {desk.outbox.length > 0 ? (
        <Card data-testid="outbox" className="bg-[oklch(0.95_0.04_150)]">
          <CardHeader>
            <CardTitle className="text-base">Sample outbox</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2">
            {desk.outbox.map((item) => (
              <div key={item.id} className="rounded-lg bg-background px-3 py-2">
                <p className="text-sm font-medium">{item.subject}</p>
                <p className="text-xs text-muted-foreground">To {item.to} · stays on this machine</p>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}
      {desk.inbox.map((email) => {
        const open = openId === email.id
        return (
          <button
            key={email.id}
            type="button"
            onClick={() => onOpen(open ? null : email.id)}
            className={`rounded-xl bg-card px-3 py-3 text-left ring-1 ring-foreground/10 ${email.unread ? "border-l-4 border-l-[oklch(0.72_0.14_70)]" : ""}`}
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-medium">{email.from.name}</p>
              <span className="shrink-0 text-[0.68rem] text-muted-foreground">{formatWhen(email.receivedAt)}</span>
            </div>
            <p className="mt-1 text-sm">{email.subject}</p>
            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{open ? email.body : email.preview}</p>
            <div className="mt-2 flex flex-wrap gap-1">
              {email.labels.map((label) => (
                <Badge key={label} variant="secondary">
                  {label}
                </Badge>
              ))}
            </div>
          </button>
        )
      })}
    </div>
  )
}
