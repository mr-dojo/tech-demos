/// <reference types="bun" />
import { describe, expect, test } from "bun:test"
import { isLocalOnlyRequest } from "./local-request"

function request(headers: Record<string, string>) {
  return { headers: { get: (name: string) => headers[name.toLowerCase()] ?? null } }
}

describe("loopback desk", () => {
  test("allows localhost and rejects a forwarded public hop", () => {
    expect(isLocalOnlyRequest(request({ host: "127.0.0.1:4310" }))).toBe(true)
    expect(isLocalOnlyRequest(request({ host: "localhost:5173" }))).toBe(true)
    expect(isLocalOnlyRequest(request({ host: "127.0.0.1:4310", "x-forwarded-for": "127.0.0.1" }))).toBe(true)
    expect(isLocalOnlyRequest(request({ host: "example.com" }))).toBe(false)
    expect(isLocalOnlyRequest(request({ host: "127.0.0.1:4310", "x-forwarded-for": "203.0.113.8" }))).toBe(false)
  })
})
