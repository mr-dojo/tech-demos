const VITE_PORT = "5173"

function isLoopbackHost(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1"
}

function mediaType(contentType: string | null): string {
  return contentType?.split(";")[0]?.trim().toLowerCase() ?? ""
}

function loopbackOrigin(origin: string, deskPort: string): boolean {
  let url: URL
  try {
    url = new URL(origin)
  } catch {
    return false
  }
  if (url.protocol !== "http:" || !isLoopbackHost(url.hostname)) return false
  const port = url.port || "80"
  return port === VITE_PORT || port === deskPort
}

export type PostDecision =
  | { ok: true }
  | { ok: false; status: 403 | 415; error: string }

/**
 * Simple cross-site posts (text/plain, no preflight) must not approve a card.
 * A post needs JSON, and either a loopback Origin on the desk or Vite port,
 * or a same-origin fetch site.
 */
export function authorizePost(
  request: { headers: { get(name: string): string | null } },
  deskPort: string,
): PostDecision {
  if (mediaType(request.headers.get("content-type")) !== "application/json") {
    return { ok: false, status: 415, error: "Content-Type must be application/json." }
  }
  if (request.headers.get("sec-fetch-site")?.trim().toLowerCase() === "same-origin") {
    return { ok: true }
  }
  const origin = request.headers.get("origin")?.trim()
  if (origin && loopbackOrigin(origin, deskPort)) return { ok: true }
  return { ok: false, status: 403, error: "This desk refuses cross-site posts." }
}

export async function readJsonBody(
  request: Request,
  deskPort: string,
): Promise<{ ok: true; body: unknown } | { ok: false; status: number; error: string }> {
  const decision = authorizePost(request, deskPort)
  if (!decision.ok) return decision
  try {
    return { ok: true, body: await request.json() }
  } catch {
    return { ok: false, status: 400, error: "The body is not JSON." }
  }
}
