import { useEffect, useRef, type RefObject } from "react"
import { ReactCompareSlider } from "react-compare-slider"
import { pageHref } from "@/lib/pages"

type Theme = {
  slug: string
  name: string
}

type CompareStageProps = {
  theme: Theme
}

function PageFrame({
  src,
  title,
  label,
  frameRef,
}: {
  src: string
  title: string
  label: string
  frameRef: RefObject<HTMLIFrameElement | null>
}) {
  return (
    <div className="relative h-full w-full bg-background">
      <iframe
        ref={frameRef}
        src={src}
        title={title}
        className="h-full w-full border-0"
        sandbox="allow-scripts allow-same-origin allow-forms"
      />
      <span className="pointer-events-none absolute top-3 left-3 rounded-md bg-background/90 px-2 py-1 text-xs font-medium text-foreground ring-1 ring-foreground/10">
        {label}
      </span>
    </div>
  )
}

export function CompareStage({ theme }: CompareStageProps) {
  const beforeRef = useRef<HTMLIFrameElement>(null)
  const afterRef = useRef<HTMLIFrameElement>(null)

  useEffect(() => {
    const before = beforeRef.current
    const after = afterRef.current
    if (!before || !after) return
    let lock = false
    const stops: Array<() => void> = []

    const bind = (source: HTMLIFrameElement, target: HTMLIFrameElement) => {
      const attach = () => {
        const win = source.contentWindow
        if (!win) return
        const onScroll = () => {
          if (lock) return
          const other = target.contentWindow
          if (!other) return
          lock = true
          other.scrollTo(0, win.scrollY)
          lock = false
        }
        win.addEventListener("scroll", onScroll, { passive: true })
        stops.push(() => win.removeEventListener("scroll", onScroll))
      }
      source.addEventListener("load", attach)
      stops.push(() => source.removeEventListener("load", attach))
      if (source.contentDocument?.readyState === "complete") attach()
    }

    bind(before, after)
    bind(after, before)
    return () => {
      for (const stop of stops) stop()
    }
  }, [theme.slug])

  return (
    <div data-testid="compare-stage" className="overflow-hidden rounded-xl ring-1 ring-foreground/10">
      <ReactCompareSlider
        className="h-[min(78vh,840px)]"
        itemOne={
          <PageFrame
            frameRef={beforeRef}
            src={pageHref("default")}
            title="Default Voltline product page"
            label="Default"
          />
        }
        itemTwo={
          <PageFrame
            frameRef={afterRef}
            src={pageHref(theme.slug)}
            title={`${theme.name} Hallmark product page`}
            label={theme.name}
          />
        }
      />
    </div>
  )
}
