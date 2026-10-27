import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AuditCards } from "@/components/audit-cards"
import { CompareStage } from "@/components/compare-stage"
import provenance from "@/data/provenance.json"
import { catalogTotal } from "@/data/product"
import { pageHref } from "@/lib/pages"

const themes = provenance.themes

export function MakeoverApp() {
  const [slug, setSlug] = useState(themes[0]?.slug ?? "halftone")
  const theme = themes.find((item) => item.slug === slug) ?? themes[0]

  if (!theme) return null

  return (
    <main className="mx-auto grid max-w-6xl gap-8 px-4 py-8 sm:px-6">
      <header className="grid gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">Sample catalog</Badge>
          <Badge variant="outline">Hallmark {provenance.hallmark}</Badge>
        </div>
        <h1 className="max-w-3xl text-3xl font-medium tracking-tight text-balance">
          Voltline's 1440p build, before and after Hallmark
        </h1>
        <p className="max-w-3xl text-sm text-muted-foreground">
          One product page for eight parts at ${catalogTotal.toLocaleString("en-US")}. Drag the
          handle to compare the default page with the Hallmark page. The prices and Harbor shelf
          counts are sample data from the Voltline catalog.
        </p>
      </header>

      <section className="grid gap-3">
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Hallmark theme">
          {themes.map((item) => (
            <Button
              key={item.slug}
              type="button"
              variant={item.slug === theme.slug ? "default" : "outline"}
              aria-pressed={item.slug === theme.slug}
              data-testid={`theme-${item.slug}`}
              onClick={() => setSlug(item.slug)}
            >
              {item.name}
            </Button>
          ))}
          <p className="text-sm text-muted-foreground">
            {theme.name}, deal {theme.deal}. {theme.shape}, hero {theme.hero}. Draw {theme.draw}.
          </p>
        </div>
        <CompareStage theme={theme} />
        <p className="text-sm text-muted-foreground">
          <a className="underline underline-offset-4" href={pageHref("default")}>
            Open the default page
          </a>
          {" · "}
          <a className="underline underline-offset-4" href={pageHref(theme.slug)}>
            Open the {theme.name} page
          </a>
        </p>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>What this run actually did</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm text-muted-foreground">
          <p>
            Hallmark {provenance.hallmark} at commit {provenance.commit} dealt this hand from a{" "}
            {provenance.catalogThemes}-theme catalog. The seed is {provenance.seed}. The skill says
            to pick one theme. This demo builds all three, and each stamp says so.
          </p>
          <p>
            The browser audit ran. The three redesigns then passed sloplint with 0 FAIL and 0
            REFLEX. {provenance.kept}
          </p>
          <p>{provenance.fileUrlPosture}</p>
          <p>{provenance.humGrain}</p>
          <p>
            A fresh-context finish review was {provenance.finishReview}. Signal 9 comps were{" "}
            {provenance.signal9}. The default page was written with the tells the audit looks for,
            then audited as a file. It is the before side of the slider.
          </p>
          <p>{provenance.sample}</p>
        </CardContent>
      </Card>

      <AuditCards />
    </main>
  )
}
