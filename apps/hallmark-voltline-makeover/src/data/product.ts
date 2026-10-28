export type Part = {
  sku: string
  name: string
  price: number
}

/** Sample catalog prices from the Voltline OpenUI demo. They are not a live price list. */
export const parts: Part[] = [
  { sku: "VL-CPU-7600", name: "Ryzen 5 7600", price: 189 },
  { sku: "VL-GPU-4070S", name: "GeForce RTX 4070 Super", price: 599 },
  { sku: "VL-MB-B650", name: "Harbor B650 ATX", price: 149 },
  { sku: "VL-RAM-32D5", name: "Kiln 32GB DDR5-6000", price: 104 },
  { sku: "VL-SSD-2T", name: "Drift 2TB NVMe", price: 134 },
  { sku: "VL-PSU-750", name: "Northspan 750W", price: 109 },
  { sku: "VL-CASE-ATX", name: "Keel Mid Tower", price: 99 },
  { sku: "VL-COOL-AIR", name: "Draft Tower 158", price: 39 },
]

export const catalogTotal = parts.reduce((sum, part) => sum + part.price, 0)
