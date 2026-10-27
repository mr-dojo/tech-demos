export function pageHref(slug: string, base: string = import.meta.env.BASE_URL || "/"): string {
  const root = base.endsWith("/") ? base : `${base}/`
  return `${root}pages/${slug}/index.html`
}
