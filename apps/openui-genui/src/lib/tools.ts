import { z } from "zod";
import type { ChatCompletionTool } from "openai/resources/chat/completions";
import {
  CATEGORIES,
  FORM_FACTORS,
  RAM_TYPES,
  SOCKETS,
  formatMoney,
  getPart,
  searchParts,
  stockLabel,
  type Part,
} from "@/lib/catalog";
import { ownedPart } from "@/lib/shopper";
import {
  checkStoreStock,
  customerProfile,
  orderHistory,
  placePickupOrder,
  quoteWarrantyExtension,
  startSupportRequest,
  warrantyStatus,
  RESOLUTIONS,
} from "@/lib/shopper";

export const PLATFORM_WATTS = 100;
const TIGHT_MM = 15;
const THIN_HEADROOM_WATTS = 100;

const CHIPSETS: Record<(typeof SOCKETS)[number], string[]> = {
  AM5: ["A620", "B650", "X670E"],
  LGA1700: ["B760", "Z790"],
  LGA1851: ["B860"],
};

export const BUILD_SLOTS = ["cpu", "gpu", "motherboard", "ram", "storage", "psu", "case", "cooler"] as const;
export type BuildSlot = (typeof BUILD_SLOTS)[number];

export const buildSchema = z.object({
  cpu: z.string().optional(),
  gpu: z.string().optional(),
  motherboard: z.string().optional(),
  ram: z.string().optional(),
  storage: z.string().optional(),
  psu: z.string().optional(),
  case: z.string().optional(),
  cooler: z.string().optional(),
  budget: z.number().nonnegative().optional(),
  includeOwned: z.boolean().optional(),
});

export type BuildInput = z.infer<typeof buildSchema>;

export const searchPartsSchema = z.object({
  category: z.enum(CATEGORIES),
  maxPrice: z.number().nonnegative().optional(),
  brand: z.string().optional(),
  socket: z.enum(SOCKETS).optional(),
  ramType: z.enum(RAM_TYPES).optional(),
  formFactor: z.enum(FORM_FACTORS).optional(),
  minWattage: z.number().nonnegative().optional(),
  minFps1440p: z.number().nonnegative().optional(),
  inStockOnly: z.boolean().optional(),
  limit: z.number().int().positive().max(12).optional(),
});

const skuListSchema = z.object({
  skus: z.array(z.string()).min(1),
  storeId: z.string().optional(),
});

const orderItemSchema = z.object({
  orderId: z.string().trim().min(1),
  sku: z.string().trim().min(1),
});

export const supportSchema = orderItemSchema.extend({
  issueType: z.string().trim().min(1, "issue type is required"),
  description: z.string().trim().min(1, "description is required"),
  resolution: z.enum(RESOLUTIONS),
});

export const pickupSchema = z.object({
  storeId: z.string().trim().min(1),
  skus: z.array(z.string()).min(1),
  window: z.string().optional(),
});

type SlotPart = { slot: BuildSlot; part: Part };

function selectedParts(input: BuildInput): { parts: SlotPart[]; unknown: string[] } {
  const parts: SlotPart[] = [];
  const unknown: string[] = [];
  for (const slot of BUILD_SLOTS) {
    const sku = input[slot]?.trim();
    if (!sku) continue;
    const part = getPart(sku);
    if (!part) unknown.push(sku);
    else parts.push({ slot, part });
  }
  return { parts, unknown };
}

export type CheckStatus = "pass" | "warn" | "fail" | "skip";

export type CompatCheck = {
  id: "socket" | "ram" | "psu" | "gpu_length" | "cooler_height";
  status: CheckStatus;
  title: string;
  detail: string;
};

function check(id: CompatCheck["id"], status: CheckStatus, title: string, detail: string): CompatCheck {
  return { id, status, title, detail };
}

export function estimateWattage(input: BuildInput): {
  watts: number;
  platformWatts: number;
  breakdown: Array<{ sku: string; name: string; watts: number }>;
  unknown: string[];
} {
  const { parts, unknown } = selectedParts(input);
  const breakdown = parts
    .filter(({ part }) => part.category === "cpu" || part.category === "gpu")
    .map(({ part }) => ({ sku: part.sku, name: part.name, watts: part.tdpWatts ?? 0 }));
  const componentWatts = breakdown.reduce((sum, line) => sum + line.watts, 0);
  const hasCompute = breakdown.length > 0;
  return {
    watts: hasCompute ? componentWatts + PLATFORM_WATTS : 0,
    platformWatts: hasCompute ? PLATFORM_WATTS : 0,
    breakdown,
    unknown,
  };
}

export function checkCompatibility(input: BuildInput): { checks: CompatCheck[]; unknown: string[] } {
  const { parts, unknown } = selectedParts(input);
  const cpu = parts.find((entry) => entry.slot === "cpu")?.part;
  const board = parts.find((entry) => entry.slot === "motherboard")?.part;
  const ram = parts.find((entry) => entry.slot === "ram")?.part;
  const gpu = parts.find((entry) => entry.slot === "gpu")?.part;
  const psu = parts.find((entry) => entry.slot === "psu")?.part;
  const pcCase = parts.find((entry) => entry.slot === "case")?.part;
  const cooler = parts.find((entry) => entry.slot === "cooler")?.part;
  const checks: CompatCheck[] = [];

  if (cpu && board && cpu.socket && board.socket) {
    if (cpu.socket !== board.socket) {
      checks.push(
        check(
          "socket",
          "fail",
          "Socket mismatch",
          `${cpu.name} is ${cpu.socket}. ${board.name} is ${board.socket}${board.chipset ? ` (${board.chipset})` : ""}.`,
        ),
      );
    } else {
      const chipsets = CHIPSETS[cpu.socket];
      const chipsetOk = !board.chipset || chipsets.includes(board.chipset);
      checks.push(
        check(
          "socket",
          chipsetOk ? "pass" : "warn",
          chipsetOk ? "Socket and chipset match" : "Chipset is unusual for this socket",
          `${cpu.name} (${cpu.socket}) fits ${board.name}${board.chipset ? `, chipset ${board.chipset}` : ""}.`,
        ),
      );
    }
  } else {
    checks.push(check("socket", "skip", "Socket", "Add a CPU and a motherboard to check the socket."));
  }

  if (ram && board && ram.ramType && board.ramType) {
    checks.push(
      ram.ramType === board.ramType
        ? check("ram", "pass", "RAM type matches", `${ram.name} is ${ram.ramType}, and ${board.name} takes ${board.ramType}.`)
        : check(
            "ram",
            "fail",
            "RAM type mismatch",
            `${ram.name} is ${ram.ramType}. ${board.name} takes ${board.ramType}.`,
          ),
    );
  } else {
    checks.push(check("ram", "skip", "RAM type", "Add RAM and a motherboard to check the memory type."));
  }

  const draw = estimateWattage(input);
  if (psu?.wattage && draw.watts > 0) {
    const headroom = psu.wattage - draw.watts;
    if (headroom < 0) {
      checks.push(
        check(
          "psu",
          "fail",
          "PSU underpowered",
          `Estimated draw is ${draw.watts}W. ${psu.name} is ${psu.wattage}W, so there is no headroom.`,
        ),
      );
    } else if (headroom < THIN_HEADROOM_WATTS) {
      checks.push(
        check(
          "psu",
          "warn",
          "PSU headroom is thin",
          `Estimated draw is ${draw.watts}W. ${psu.name} leaves ${headroom}W.`,
        ),
      );
    } else {
      checks.push(
        check(
          "psu",
          "pass",
          "PSU has headroom",
          `Estimated draw is ${draw.watts}W. ${psu.name} (${psu.wattage}W) leaves ${headroom}W.`,
        ),
      );
    }
  } else {
    checks.push(check("psu", "skip", "PSU headroom", "Add a PSU and a CPU or GPU to estimate wattage."));
  }

  if (gpu?.lengthMm && pcCase?.clearanceMm) {
    const room = pcCase.clearanceMm - gpu.lengthMm;
    if (room < 0) {
      checks.push(
        check("gpu_length", "fail", "GPU does not fit", `${gpu.name} is ${gpu.lengthMm}mm. ${pcCase.name} clears ${pcCase.clearanceMm}mm.`),
      );
    } else if (room < TIGHT_MM) {
      checks.push(
        check("gpu_length", "warn", "GPU clearance is tight", `${gpu.name} is ${gpu.lengthMm}mm in a case that clears ${pcCase.clearanceMm}mm (${room}mm left).`),
      );
    } else {
      checks.push(
        check("gpu_length", "pass", "GPU fits the case", `${gpu.name} is ${gpu.lengthMm}mm. ${pcCase.name} clears ${pcCase.clearanceMm}mm.`),
      );
    }
  } else {
    checks.push(check("gpu_length", "skip", "GPU length", "Add a GPU and a case to check clearance."));
  }

  if (cooler?.coolerHeightMm && pcCase?.maxCoolerMm) {
    const room = pcCase.maxCoolerMm - cooler.coolerHeightMm;
    const bracket =
      cpu?.socket && cooler.sockets && !cooler.sockets.includes(cpu.socket)
        ? ` The cooler bracket list does not include ${cpu.socket}.`
        : "";
    if (room < 0) {
      checks.push(
        check(
          "cooler_height",
          "fail",
          "Cooler is too tall",
          `${cooler.name} is ${cooler.coolerHeightMm}mm. ${pcCase.name} allows ${pcCase.maxCoolerMm}mm.${bracket}`,
        ),
      );
    } else if (room < TIGHT_MM || bracket) {
      checks.push(
        check(
          "cooler_height",
          "warn",
          room < TIGHT_MM ? "Cooler clearance is tight" : "Check the cooler bracket",
          `${cooler.name} is ${cooler.coolerHeightMm}mm. ${pcCase.name} allows ${pcCase.maxCoolerMm}mm (${room}mm left).${bracket}`,
        ),
      );
    } else {
      checks.push(
        check(
          "cooler_height",
          "pass",
          "Cooler fits",
          `${cooler.name} is ${cooler.coolerHeightMm}mm. ${pcCase.name} allows ${pcCase.maxCoolerMm}mm.`,
        ),
      );
    }
  } else {
    checks.push(check("cooler_height", "skip", "Cooler height", "Add a cooler and a case to check height."));
  }

  return { checks, unknown };
}

export type PricedLine = {
  slot: BuildSlot;
  sku: string;
  name: string;
  price: number;
  stock: Part["stock"];
  owned: boolean;
  countedInTotal: boolean;
  purchasedOn?: string;
  note: string;
  rating: number;
  reviewCount: number;
};

export function priceBuild(input: BuildInput): {
  lines: PricedLine[];
  total: number;
  ownedValue: number;
  budget?: number;
  remaining?: number;
  includeOwned: boolean;
  unknown: string[];
} {
  const { parts, unknown } = selectedParts(input);
  const includeOwned = input.includeOwned ?? false;
  const lines = parts.map(({ slot, part }) => {
    const owned = ownedPart(part.sku);
    const countedInTotal = !owned || includeOwned;
    let note = "Add to pickup";
    if (owned && includeOwned) note = `${owned.phrase}. Buying another.`;
    else if (owned) note = owned.phrase;
    return {
      slot,
      sku: part.sku,
      name: part.name,
      price: part.price,
      stock: part.stock,
      rating: part.rating,
      reviewCount: part.reviewCount,
      owned: Boolean(owned),
      countedInTotal,
      purchasedOn: owned?.purchasedOn,
      note,
    };
  });
  const total = lines.filter((line) => line.countedInTotal).reduce((sum, line) => sum + line.price, 0);
  const ownedValue = lines.filter((line) => line.owned && !line.countedInTotal).reduce((sum, line) => sum + line.price, 0);
  return {
    lines,
    total,
    ownedValue,
    budget: input.budget,
    remaining: input.budget === undefined ? undefined : input.budget - total,
    includeOwned,
    unknown,
  };
}

const TOOL_DEFS: Array<{ name: string; description: string; schema: z.ZodType }> = [
  {
    name: "search_parts",
    description:
      "Search the Voltline sample catalog. Category is required. Out-of-stock parts are hidden unless inStockOnly is false. Each part includes its sample rating and reviewCount. Never invent SKUs, ratings, or review counts.",
    schema: searchPartsSchema,
  },
  {
    name: "check_compatibility",
    description:
      "Check a build for socket/chipset match, RAM type, PSU headroom versus estimated draw, GPU length versus case clearance, and cooler height. Pass SKUs from the catalog.",
    schema: buildSchema,
  },
  {
    name: "estimate_wattage",
    description: "Estimate system draw from CPU and GPU sample TDPs plus a fixed platform overhead. Do not invent wattage.",
    schema: buildSchema,
  },
  {
    name: "price_build",
    description:
      "Price a build from catalog SKUs. Parts the sample shopper already owns are excluded from the total unless includeOwned is true. Each line includes the catalog rating and reviewCount. Flag owned lines and do not invent prices or ratings.",
    schema: buildSchema,
  },
  {
    name: "get_customer_profile",
    description: "Sample shopper profile for Alex Rivera, including parts they already own. No arguments.",
    schema: z.object({}),
  },
  {
    name: "get_order_history",
    description: "Sample order history: dates, pickup versus shipped, warranty state, and return-window status.",
    schema: z.object({}),
  },
  {
    name: "get_warranty_status",
    description: "Warranty state for one order item. Expired plans are not extendable.",
    schema: orderItemSchema,
  },
  {
    name: "quote_warranty_extension",
    description: "Mock extension prices for an active or expiring plan. Returns an error reason when the plan is expired.",
    schema: orderItemSchema,
  },
  {
    name: "start_support_request",
    description:
      "Open a sample support case for an order item. Resolution is return, exchange, or repair. A return fails when the return window is closed.",
    schema: supportSchema,
  },
  {
    name: "check_store_stock",
    description:
      "Per-store sample stock for a list of SKUs. Owned parts are treated as brought by the customer. Use this before reserving pickup.",
    schema: skuListSchema,
  },
  {
    name: "place_pickup_order",
    description:
      "Reserve SKUs for in-store pickup at a Voltline store. Fails when the store is out of stock for any SKU the shopper does not already own. This is a sample reservation, not checkout. Prefer pickup over shipping.",
    schema: pickupSchema,
  },
];

function defineTool(name: string, description: string, schema: z.ZodType): ChatCompletionTool {
  const parameters = z.toJSONSchema(schema) as Record<string, unknown>;
  delete parameters.$schema;
  return { type: "function", function: { name, description, parameters } };
}

export function catalogTools(): ChatCompletionTool[] {
  return TOOL_DEFS.map((tool) => defineTool(tool.name, tool.description, tool.schema));
}

function parseArgs<T>(schema: z.ZodType<T>, args: unknown): { ok: true; data: T } | { ok: false; error: string } {
  const parsed = schema.safeParse(args ?? {});
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "invalid arguments" };
  return { ok: true, data: parsed.data };
}

export async function executeTool(name: string, args: unknown, signal?: AbortSignal): Promise<string> {
  signal?.throwIfAborted();
  const payload = runTool(name, args);
  signal?.throwIfAborted();
  return JSON.stringify(payload);
}

export function runTool(name: string, args: unknown): unknown {
  switch (name) {
    case "search_parts": {
      const parsed = parseArgs(searchPartsSchema, args);
      if (!parsed.ok) return { error: parsed.error };
      return {
        parts: searchParts(parsed.data).map((part) => ({
          ...part,
          priceLabel: formatMoney(part.price),
          stockLabel: stockLabel(part.stock),
        })),
      };
    }
    case "check_compatibility": {
      const parsed = parseArgs(buildSchema, args);
      if (!parsed.ok) return { error: parsed.error };
      return checkCompatibility(parsed.data);
    }
    case "estimate_wattage": {
      const parsed = parseArgs(buildSchema, args);
      if (!parsed.ok) return { error: parsed.error };
      return estimateWattage(parsed.data);
    }
    case "price_build": {
      const parsed = parseArgs(buildSchema, args);
      if (!parsed.ok) return { error: parsed.error };
      const priced = priceBuild(parsed.data);
      if (priced.lines.length === 0) return { error: "add at least one catalog SKU" };
      return priced;
    }
    case "get_customer_profile":
      return customerProfile();
    case "get_order_history":
      return { asOf: customerProfile().asOf, orders: orderHistory() };
    case "get_warranty_status": {
      const parsed = parseArgs(orderItemSchema, args);
      if (!parsed.ok) return { error: parsed.error };
      return warrantyStatus(parsed.data.orderId, parsed.data.sku);
    }
    case "quote_warranty_extension": {
      const parsed = parseArgs(orderItemSchema, args);
      if (!parsed.ok) return { error: parsed.error };
      return quoteWarrantyExtension(parsed.data.orderId, parsed.data.sku);
    }
    case "start_support_request": {
      const parsed = parseArgs(supportSchema, args);
      if (!parsed.ok) return { error: parsed.error };
      return startSupportRequest(parsed.data);
    }
    case "check_store_stock": {
      const parsed = parseArgs(skuListSchema, args);
      if (!parsed.ok) return { error: parsed.error };
      return checkStoreStock(parsed.data.skus, parsed.data.storeId);
    }
    case "place_pickup_order": {
      const parsed = parseArgs(pickupSchema, args);
      if (!parsed.ok) return { error: parsed.error };
      return placePickupOrder(parsed.data);
    }
    default:
      return { error: `Unknown tool: ${name}` };
  }
}

export const SLOT_LABEL: Record<BuildSlot, string> = {
  cpu: "CPU",
  gpu: "GPU",
  motherboard: "Motherboard",
  ram: "RAM",
  storage: "Storage",
  psu: "PSU",
  case: "Case",
  cooler: "Cooler",
};
