function isLoopback(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1"
}

function hostnameOf(hostHeader: string): string | null {
  const host = hostHeader.trim().toLowerCase()
  if (!host) return null
  if (host.startsWith("[")) {
    const end = host.indexOf("]")
    if (end < 0) return null
    return host.slice(1, end)
  }
  return host.split(":")[0] ?? null
}

function hopIsLoopback(hop: string): boolean {
  const hostname = hostnameOf(hop)
  return hostname !== null && isLoopback(hostname)
}

export function isLocalOnlyRequest(request: { headers: { get(name: string): string | null } }): boolean {
  const host = request.headers.get("host")
  if (!host) return false
  const hostname = hostnameOf(host)
  if (!hostname || !isLoopback(hostname)) return false

  const forwardedFor = request.headers.get("x-forwarded-for")
  if (forwardedFor) {
    const hops = forwardedFor.split(",").map((hop) => hop.trim()).filter(Boolean)
    if (hops.length === 0 || hops.some((hop) => !hopIsLoopback(hop))) return false
  }

  const forwarded = request.headers.get("forwarded")
  if (forwarded) {
    const fors = [...forwarded.matchAll(/for=(?:"\[?([^"\];]+)"?|([^;,\s]+))/gi)]
    if (fors.length === 0) return false
    for (const match of fors) {
      const value = (match[1] ?? match[2] ?? "").replace(/\]$/, "")
      if (!hopIsLoopback(value)) return false
    }
  }

  return true
}
