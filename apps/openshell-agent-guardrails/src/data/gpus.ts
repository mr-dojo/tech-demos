import type { Gpu } from "@/lib/reprice"

/**
 * Shelf prices match the sample Voltline catalog in apps/openui-genui.
 * Supplier costs are made-up figures for this repricing task.
 */
export const GPUS: Gpu[] = [
  { sku: "VL-GPU-4060", name: "GeForce RTX 4060", brand: "NVIDIA", shelfPrice: 299, supplierCost: 240, stock: "in_stock" },
  { sku: "VL-GPU-4060TI", name: "GeForce RTX 4060 Ti 16GB", brand: "NVIDIA", shelfPrice: 439, supplierCost: 360, stock: "in_stock" },
  { sku: "VL-GPU-4070", name: "GeForce RTX 4070", brand: "NVIDIA", shelfPrice: 549, supplierCost: 520, stock: "low" },
  { sku: "VL-GPU-4070S", name: "GeForce RTX 4070 Super", brand: "NVIDIA", shelfPrice: 599, supplierCost: 480, stock: "in_stock" },
  { sku: "VL-GPU-4080S", name: "GeForce RTX 4080 Super", brand: "NVIDIA", shelfPrice: 999, supplierCost: 860, stock: "in_stock" },
  { sku: "VL-GPU-7600", name: "Radeon RX 7600", brand: "AMD", shelfPrice: 259, supplierCost: 210, stock: "in_stock" },
  { sku: "VL-GPU-7800XT", name: "Radeon RX 7800 XT", brand: "AMD", shelfPrice: 489, supplierCost: 460, stock: "in_stock" },
  { sku: "VL-GPU-7900GRE", name: "Radeon RX 7900 GRE", brand: "AMD", shelfPrice: 549, supplierCost: 500, stock: "low" },
  { sku: "VL-GPU-1070", name: "GeForce GTX 1070", brand: "NVIDIA", shelfPrice: 199, supplierCost: 140, stock: "out_of_stock" },
]
