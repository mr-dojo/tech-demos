import { z } from "zod";
import catalogJson from "@/data/catalog.json";

export const CATEGORIES = [
  "cpu",
  "gpu",
  "motherboard",
  "ram",
  "storage",
  "psu",
  "case",
  "cooler",
  "monitor",
  "peripheral",
] as const;

export const SOCKETS = ["AM5", "LGA1700", "LGA1851"] as const;
export const RAM_TYPES = ["DDR4", "DDR5"] as const;
export const FORM_FACTORS = ["ATX", "mATX", "ITX"] as const;

const partSchema = z.object({
  sku: z.string().min(1),
  name: z.string().min(1),
  category: z.enum(CATEGORIES),
  brand: z.string().min(1),
  price: z.number().nonnegative(),
  stock: z.enum(["in_stock", "low", "out_of_stock"]),
  socket: z.enum(SOCKETS).optional(),
  sockets: z.array(z.enum(SOCKETS)).optional(),
  chipset: z.string().optional(),
  ramType: z.enum(RAM_TYPES).optional(),
  tdpWatts: z.number().optional(),
  wattage: z.number().optional(),
  lengthMm: z.number().optional(),
  clearanceMm: z.number().optional(),
  coolerHeightMm: z.number().optional(),
  maxCoolerMm: z.number().optional(),
  formFactor: z.enum(FORM_FACTORS).optional(),
  fits: z.array(z.enum(FORM_FACTORS)).optional(),
  capacityGb: z.number().optional(),
  fps1440p: z.number().optional(),
  rating: z.number().min(0).max(5),
  reviewCount: z.number().int().nonnegative(),
});

export type Part = z.infer<typeof partSchema>;
export type Category = Part["category"];
export type Socket = (typeof SOCKETS)[number];

export const CATALOG_NOTE = catalogJson.note;
export const PARTS: Part[] = z.array(partSchema).parse(catalogJson.parts);

const bySku = new Map(PARTS.map((part) => [part.sku, part]));

export function getPart(sku: string): Part | undefined {
  return bySku.get(sku.trim());
}

export function formatMoney(amount: number): string {
  return `$${amount.toLocaleString("en-US")}`;
}

export function ratingLabel(part: Pick<Part, "rating" | "reviewCount">): string {
  return `${part.rating.toFixed(1)} · ${part.reviewCount.toLocaleString("en-US")} reviews`;
}

export function stockLabel(stock: Part["stock"]): string {
  if (stock === "in_stock") return "In stock";
  if (stock === "low") return "Low stock";
  return "Out of stock";
}

export type PartSearch = {
  category: Category;
  maxPrice?: number;
  brand?: string;
  socket?: Socket;
  ramType?: (typeof RAM_TYPES)[number];
  formFactor?: (typeof FORM_FACTORS)[number];
  minWattage?: number;
  minFps1440p?: number;
  inStockOnly?: boolean;
  limit?: number;
};

export function searchParts(query: PartSearch): Part[] {
  const brand = query.brand?.trim().toLowerCase();
  const inStockOnly = query.inStockOnly ?? true;
  const limit = query.limit ?? 8;
  return PARTS.filter((part) => {
    if (part.category !== query.category) return false;
    if (inStockOnly && part.stock === "out_of_stock") return false;
    if (query.maxPrice !== undefined && part.price > query.maxPrice) return false;
    if (brand && !part.brand.toLowerCase().includes(brand)) return false;
    if (query.socket && part.socket !== query.socket && !part.sockets?.includes(query.socket)) return false;
    if (query.ramType && part.ramType !== query.ramType) return false;
    if (query.formFactor && part.formFactor !== query.formFactor && !part.fits?.includes(query.formFactor)) {
      return false;
    }
    if (query.minWattage !== undefined && (part.wattage ?? 0) < query.minWattage) return false;
    if (query.minFps1440p !== undefined && (part.fps1440p ?? 0) < query.minFps1440p) return false;
    return true;
  })
    .sort((left, right) => left.price - right.price)
    .slice(0, limit);
}
