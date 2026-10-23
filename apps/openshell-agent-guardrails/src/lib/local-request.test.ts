import { describe, expect, test } from "bun:test"
import { isLocalOnlyRequest } from "@/lib/local-request"

function request(headers: Record<string, string>) {
  return {
    headers: {
      get(name: string) {
        return headers[name.toLowerCase()] ?? null
      },
    },
  }
}

describe("isLocalOnlyRequest", () => {
  test("accepts loopback hosts", () => {
    expect(isLocalOnlyRequest(request({ host: "localhost:3000" }))).toBe(true)
    expect(isLocalOnlyRequest(request({ host: "127.0.0.1:3000" }))).toBe(true)
    expect(isLocalOnlyRequest(request({ host: "[::1]:3000" }))).toBe(true)
  })

  test("rejects other hosts and forwarded requests", () => {
    expect(isLocalOnlyRequest(request({ host: "example.com" }))).toBe(false)
    expect(isLocalOnlyRequest(request({}))).toBe(false)
    expect(
      isLocalOnlyRequest(request({ host: "127.0.0.1:3000", "x-forwarded-for": "203.0.113.5" })),
    ).toBe(false)
    expect(
      isLocalOnlyRequest(request({ host: "localhost:3000", forwarded: "for=203.0.113.5" })),
    ).toBe(false)
  })
})
