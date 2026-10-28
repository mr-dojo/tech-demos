/// <reference types="bun" />
import { describe, expect, test } from "bun:test"
import { pageHref } from "@/lib/pages"

describe("page href", () => {
  test("prefixes a subpath without a double slash", () => {
    expect(pageHref("halftone", "/tech-demos/hallmark-voltline-makeover/")).toBe(
      "/tech-demos/hallmark-voltline-makeover/pages/halftone/index.html",
    )
    expect(pageHref("default", "/tech-demos/hallmark-voltline-makeover")).toBe(
      "/tech-demos/hallmark-voltline-makeover/pages/default/index.html",
    )
  })

  test("keeps a root base as a single slash", () => {
    expect(pageHref("arcade", "/")).toBe("/pages/arcade/index.html")
  })
})
