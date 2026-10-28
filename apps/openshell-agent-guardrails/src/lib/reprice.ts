export const MARGIN_FLOOR = 0.08
export const CUT_GAP_DOLLARS = 40

export type Stock = "in_stock" | "low" | "out_of_stock"

export type Gpu = {
  sku: string
  name: string
  brand: string
  shelfPrice: number
  supplierCost: number
  stock: Stock
}

export type RepriceAction = "hold" | "cut" | "raise" | "skip"

export type RepriceLine = {
  sku: string
  name: string
  brand: string
  shelfPrice: number
  supplierCost: number
  floorPrice: number
  suggestedPrice: number
  delta: number
  action: RepriceAction
  reason: string
}

export type PublishDecision = "pending" | "approved" | "denied"

/** Smallest whole-dollar shelf that keeps at least an 8% margin over supplier cost. */
export function floorPrice(costDollars: number): number {
  if (!Number.isFinite(costDollars) || costDollars < 0) {
    throw new Error("cost must be a non-negative finite number")
  }
  const cents = Math.round(costDollars * 100)
  const minCents = Math.ceil(cents / (1 - MARGIN_FLOOR) - 1e-9)
  return Math.ceil(minCents / 100 - 1e-9)
}

export function suggestPrice(gpu: Gpu): RepriceLine {
  const floor = floorPrice(gpu.supplierCost)
  const base = {
    sku: gpu.sku,
    name: gpu.name,
    brand: gpu.brand,
    shelfPrice: gpu.shelfPrice,
    supplierCost: gpu.supplierCost,
    floorPrice: floor,
  }
  if (gpu.stock === "out_of_stock") {
    return {
      ...base,
      suggestedPrice: gpu.shelfPrice,
      delta: 0,
      action: "skip",
      reason: "Out of stock, so it stays off the publish set.",
    }
  }
  if (gpu.shelfPrice < floor) {
    return {
      ...base,
      suggestedPrice: floor,
      delta: floor - gpu.shelfPrice,
      action: "raise",
      reason: "Shelf price is under the 8% margin floor.",
    }
  }
  const gap = gpu.shelfPrice - floor
  if (gap > CUT_GAP_DOLLARS) {
    const suggested = Math.max(floor, Math.round((gpu.shelfPrice + floor) / 2))
    return {
      ...base,
      suggestedPrice: suggested,
      delta: suggested - gpu.shelfPrice,
      action: suggested === gpu.shelfPrice ? "hold" : "cut",
      reason: "Supplier cost left room to move halfway toward the floor.",
    }
  }
  return {
    ...base,
    suggestedPrice: gpu.shelfPrice,
    delta: 0,
    action: "hold",
    reason: "Margin already clears the floor.",
  }
}

export function reprice(gpus: Gpu[]): RepriceLine[] {
  return gpus.map(suggestPrice)
}

export function publishedLines(lines: RepriceLine[], decision: PublishDecision): RepriceLine[] {
  if (decision !== "approved") return []
  return lines.filter((line) => line.action !== "skip")
}
