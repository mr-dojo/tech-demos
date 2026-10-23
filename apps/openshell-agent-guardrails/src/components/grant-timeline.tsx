import type { FeedEvent } from "@/data/trace"

export function GrantTimeline({ events }: { events: FeedEvent[] }) {
  return (
    <section className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
      <h2 className="text-base font-medium">Granted</h2>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
        Actions the replay has treated as allowed. Sample steps are marked in the feed.
      </p>
      {events.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">Nothing granted yet.</p>
      ) : (
        <ol className="mt-3 space-y-3">
          {events.map((event, index) => (
            <li key={event.id} className="flex gap-3">
              <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-emerald-600 text-[10px] font-medium text-white">
                {index + 1}
              </span>
              <div>
                <p className="text-sm font-medium">{event.title}</p>
                <p className="text-xs leading-relaxed text-muted-foreground">{event.detail}</p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
