/// <reference types="bun" />
import { describe, expect, test } from "bun:test"
import { readFileSync } from "node:fs"
import provenance from "@/data/provenance.json"
import { catalogTotal, parts } from "@/data/product"
import { audit, gateCards } from "@/lib/audit"

const page = (slug: string) =>
  readFileSync(new URL(`../../public/pages/${slug}/index.html`, import.meta.url), "utf8")
const css = (slug: string) =>
  readFileSync(new URL(`../../public/pages/${slug}/style.css`, import.meta.url), "utf8")

describe("sample catalog", () => {
  test("the eight prices sum to 1422", () => {
    expect(parts).toHaveLength(8)
    expect(catalogTotal).toBe(1422)
  })
})

describe("audit file", () => {
  test("every finding has a gate, a grade, a line, and evidence", () => {
    expect(audit.findings.length).toBeGreaterThan(0)
    for (const finding of audit.findings) {
      expect(finding.gate.length).toBeGreaterThan(0)
      expect(finding.grade.length).toBeGreaterThan(0)
      expect(typeof finding.line).toBe("number")
      expect(finding.evidence.length).toBeGreaterThan(0)
    }
  })

  test("every gate that fired has a settlement", () => {
    const cards = gateCards()
    expect(cards.length).toBeGreaterThan(0)
    for (const card of cards) {
      expect(card.settlement.length).toBeGreaterThan(0)
    }
  })

  test("the render tier ran and the email closer was flagged", () => {
    expect(audit.render).toBe("ran")
    expect(audit.findings.some((finding) => finding.gate === "85")).toBe(true)
    expect(audit.findings.some((finding) => finding.gate === "54")).toBe(true)
    expect(audit.findings.some((finding) => finding.gate === "38iii")).toBe(true)
  })
})

describe("provenance", () => {
  test("names Hallmark 2.0.0 and the three dealt slugs", () => {
    expect(provenance.hallmark).toBe("2.0.0")
    expect(provenance.commit).toBe("6033bab2a8051b5454552d2e8e6cb8f27c483a42")
    expect(provenance.themes.map((theme) => theme.slug)).toEqual(["halftone", "arcade", "hum"])
    expect(provenance.finishReview).toBe("not run")
    expect(provenance.render).toBe("ran")
  })
})

describe("pages", () => {
  test("the redesigns carry a Hallmark stamp and the default page does not", () => {
    expect(css("default").startsWith("/* Hallmark")).toBe(false)
    for (const slug of ["halftone", "arcade", "hum"]) {
      expect(css(slug).startsWith("/* Hallmark")).toBe(true)
    }
  })

  test("Google fonts are files in this app, and Chillax stays on Fontshare", () => {
    for (const slug of ["default", "halftone", "arcade"]) {
      expect(page(slug)).not.toContain("fonts.googleapis.com")
      expect(page(slug)).toContain("../../fonts/faces.css")
    }
    expect(page("hum")).toContain("api.fontshare.com")
    expect(page("hum")).not.toContain("fonts.googleapis.com")
  })

  test("the redesigned pages do not contain the invented 50,000 line", () => {
    expect(page("default")).toContain("50,000")
    for (const slug of ["halftone", "arcade", "hum"]) {
      expect(page(slug)).not.toContain("50,000")
    }
  })
})
