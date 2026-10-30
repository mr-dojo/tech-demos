import type { DeskMode } from "@/lib/types"

export function ModeBanner({ mode }: { mode: DeskMode }) {
  const replay = mode.kind === "replay"
  return (
    <div
      data-testid="mode-banner"
      className={
        replay
          ? "bg-[oklch(0.38_0.09_255)] text-white"
          : "bg-[oklch(0.9_0.06_80)] text-[oklch(0.28_0.04_55)]"
      }
    >
      <div className="mx-auto flex max-w-7xl flex-wrap items-baseline gap-x-3 gap-y-1 px-4 py-2">
        <p className="font-heading text-lg leading-none">{mode.title}</p>
        <p className="text-sm opacity-90">{mode.detail}</p>
      </div>
    </div>
  )
}
