/// <reference types="bun" />
import { describe, expect, test } from "bun:test"
import { authorizePost, readJsonBody } from "./post-gate"

const desk = "4310"

function call(headers: Record<string, string>) {
  return authorizePost({ headers: { get: (name: string) => headers[name.toLowerCase()] ?? null } }, desk)
}

describe("post gate", () => {
  test("rejects a text/plain post from another origin", () => {
    const decision = call({
      "content-type": "text/plain",
      origin: "https://evil.example",
    })
    expect(decision).toEqual({ ok: false, status: 415, error: "Content-Type must be application/json." })
  })

  test("rejects JSON from a foreign origin", () => {
    const decision = call({
      "content-type": "application/json",
      origin: "https://evil.example",
      "sec-fetch-site": "cross-site",
    })
    expect(decision.ok).toBe(false)
    if (!decision.ok) expect(decision.status).toBe(403)
  })

  test("rejects JSON with no origin and no same-origin site", () => {
    const decision = call({ "content-type": "application/json" })
    expect(decision.ok).toBe(false)
    if (!decision.ok) expect(decision.status).toBe(403)
  })

  test("rejects a loopback origin on an unexpected port", () => {
    const decision = call({
      "content-type": "application/json",
      origin: "http://127.0.0.1:9999",
    })
    expect(decision.ok).toBe(false)
    if (!decision.ok) expect(decision.status).toBe(403)
  })

  test("allows the Vite origin and the desk origin", () => {
    expect(call({ "content-type": "application/json", origin: "http://127.0.0.1:5173" }).ok).toBe(true)
    expect(call({ "content-type": "application/json", origin: "http://localhost:5173" }).ok).toBe(true)
    expect(call({ "content-type": "application/json", origin: "http://127.0.0.1:4310" }).ok).toBe(true)
    expect(call({ "content-type": "application/json; charset=utf-8", origin: "http://localhost:4310" }).ok).toBe(true)
  })

  test("allows a same-origin fetch site without an Origin header", () => {
    expect(call({ "content-type": "application/json", "sec-fetch-site": "same-origin" }).ok).toBe(true)
  })

  test("a broken JSON body is 400, not a server error", async () => {
    const request = new Request("http://127.0.0.1:4310/api/turn", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "http://127.0.0.1:4310",
      },
      body: "{",
    })
    const result = await readJsonBody(request, desk)
    expect(result).toEqual({ ok: false, status: 400, error: "The body is not JSON." })
  })
})
