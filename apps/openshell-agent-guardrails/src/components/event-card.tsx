import { Badge } from "@/components/ui/badge"
import type { FeedEvent } from "@/data/trace"
import { cn } from "@/lib/utils"
import { FileText, Globe, KeyRound, ScrollText, Terminal } from "lucide-react"

const kindIcon = {
  network: Globe,
  file: FileText,
  credential: KeyRound,
  process: Terminal,
  policy: ScrollText,
} as const

const decisionLabel = {
  allowed: "Allowed",
  blocked: "Blocked",
  flagged: "Flagged",
  info: "Info",
} as const

export function EventCard({ event }: { event: FeedEvent }) {
  const Icon = kindIcon[event.kind]
  return (
    <article
      className={cn(
        "rounded-xl bg-card p-3 ring-1 ring-foreground/10",
        event.decision === "allowed" && "border-l-4 border-l-emerald-600",
        event.decision === "blocked" && "border-l-4 border-l-destructive",
        event.decision === "flagged" && "border-l-4 border-l-amber-500",
        event.decision === "info" && "border-l-4 border-l-border",
      )}
    >
      <div className="flex items-start gap-3">
        <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
          <Icon className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <h3 className="font-medium">{event.title}</h3>
            <Badge variant={event.decision === "blocked" ? "destructive" : "secondary"}>
              {decisionLabel[event.decision]}
            </Badge>
            <Badge variant="outline">{event.source === "recorded" ? "Recorded" : "Sample"}</Badge>
          </div>
          <p className="mt-1 text-sm leading-relaxed text-pretty">{event.detail}</p>
          <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{event.sourceNote}</p>
        </div>
      </div>
    </article>
  )
}
