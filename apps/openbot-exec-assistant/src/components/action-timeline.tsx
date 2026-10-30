import type { TimelineItem } from "@/lib/types"

const tone: Record<TimelineItem["kind"], string> = {
  read: "bg-[oklch(0.55_0.04_250)]",
  proposed: "bg-[oklch(0.72_0.14_70)]",
  approved: "bg-[oklch(0.55_0.12_150)]",
  rejected: "bg-[oklch(0.58_0.18_25)]",
  done: "bg-[oklch(0.35_0.03_55)]",
}

export function ActionTimeline({ items }: { items: TimelineItem[] }) {
  return (
    <section data-testid="timeline">
      <h2 className="font-heading text-xl">What Mira did</h2>
      <p className="mt-1 text-xs text-muted-foreground">Reads, proposals, and the decisions you made.</p>
      {items.length === 0 ? (
        <p className="mt-4 rounded-xl border border-dashed px-3 py-6 text-sm text-muted-foreground">
          The timeline fills as Mira reads the sample desk.
        </p>
      ) : (
        <ol className="mt-4 space-y-0">
          {items.map((item, index) => (
            <li key={item.id} className="grid grid-cols-[16px_minmax(0,1fr)] gap-3">
              <div className="flex flex-col items-center">
                <span className={`mt-1.5 size-2.5 rounded-full ${tone[item.kind]}`} />
                {index < items.length - 1 ? <span className="w-px flex-1 bg-border" /> : null}
              </div>
              <div className="pb-4">
                <p className="text-[0.68rem] tracking-wide text-muted-foreground uppercase">{item.kind}</p>
                <p className="text-sm font-medium">{item.title}</p>
                <p className="text-xs text-muted-foreground">{item.detail}</p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
