import { describe, expect, test } from "bun:test"
import { GPUS } from "@/data/gpus"
import { floorPrice, publishedLines, reprice, suggestPrice } from "@/lib/reprice"

describe("floorPrice", () => {
  test("keeps an 8% margin in whole dollars", () => {
    expect(floorPrice(520)).toBe(566)
    expect(floorPrice(460)).toBe(500)
    expect(floorPrice(240)).toBe(261)
  })
})

describe("suggestPrice", () => {
  test("raises an under-margin GPU to the floor", () => {
    const line = suggestPrice(GPUS.find((gpu) => gpu.sku === "VL-GPU-4070")!)
    expect(line.action).toBe("raise")
    expect(line.suggestedPrice).toBe(566)
    expect(line.suggestedPrice).toBeGreaterThanOrEqual(line.floorPrice)
  })

  test("cuts a wide gap and stays on the floor", () => {
    const line = suggestPrice(GPUS.find((gpu) => gpu.sku === "VL-GPU-4070S")!)
    expect(line.action).toBe("cut")
    expect(line.suggestedPrice).toBe(561)
    expect(line.suggestedPrice).toBeGreaterThanOrEqual(line.floorPrice)
    expect(line.delta).toBeLessThan(0)
  })

  test("holds a price that is already close to the floor", () => {
    const line = suggestPrice(GPUS.find((gpu) => gpu.sku === "VL-GPU-4060")!)
    expect(line.action).toBe("hold")
    expect(line.delta).toBe(0)
  })

  test("skips the out-of-stock card", () => {
    const line = suggestPrice(GPUS.find((gpu) => gpu.sku === "VL-GPU-1070")!)
    expect(line.action).toBe("skip")
    expect(line.suggestedPrice).toBe(199)
  })
})

describe("publishedLines", () => {
  const lines = reprice(GPUS)

  test("approve publishes every in-stock suggestion", () => {
    const published = publishedLines(lines, "approved")
    expect(published).toHaveLength(8)
    expect(published.some((line) => line.sku === "VL-GPU-1070")).toBe(false)
    for (const line of published) {
      expect(line.suggestedPrice).toBeGreaterThanOrEqual(line.floorPrice)
    }
  })

  test("deny and pending publish nothing", () => {
    expect(publishedLines(lines, "denied")).toEqual([])
    expect(publishedLines(lines, "pending")).toEqual([])
  })
})
