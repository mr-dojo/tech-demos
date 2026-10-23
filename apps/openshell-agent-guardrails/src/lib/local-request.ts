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

export function isLocalOnlyRequest(request: { headers: { get(name: string): string | null } }): boolean {
  const host = request.headers.get("host")
  if (!host) return false
  const hostname = hostnameOf(host)
  if (hostname !== "localhost" && hostname !== "127.0.0.1" && hostname !== "::1") return false
  if (request.headers.get("x-forwarded-for") || request.headers.get("forwarded")) return false
  return true
}
