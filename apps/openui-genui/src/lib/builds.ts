import type { BuildInput } from "@/lib/tools";

/** $1,500 1440p list. RAM, SSD, PSU, and case are ones the sample shopper already owns. */
export const GAMING_BUILD: BuildInput = {
  cpu: "VL-CPU-7600",
  gpu: "VL-GPU-4070S",
  motherboard: "VL-MB-B650",
  ram: "VL-RAM-32D5",
  storage: "VL-SSD-2T",
  psu: "VL-PSU-750",
  case: "VL-CASE-ATX",
  cooler: "VL-COOL-AIR",
  budget: 1500,
};

export const GAMING_PICKUP_SKUS = ["VL-CPU-7600", "VL-GPU-4070S", "VL-MB-B650", "VL-COOL-AIR"] as const;

export const GPU_COMPARE_SKUS = ["VL-GPU-4060", "VL-GPU-7800XT", "VL-GPU-4070S"] as const;

export const MONITOR_WARRANTY = { orderId: "VL-ORD-1901", sku: "VL-MON-27" } as const;

export const EXPIRED_WARRANTY = { orderId: "VL-ORD-1622", sku: "VL-AUD-HS" } as const;

export const RETURN_ITEM = {
  orderId: "VL-ORD-2140",
  sku: "VL-KEY-TKL",
  issueType: "Defect or DOA",
  description: "The right shift key does not register.",
  resolution: "return" as const,
};

export const PICKUP_STORE_ID = "store-harbor";
export const OUT_OF_STOCK_STORE_ID = "store-keel";
