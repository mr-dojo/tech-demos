import { z } from "zod";
import shopperJson from "@/data/shopper.json";
import { getPart, type Part } from "@/lib/catalog";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const shopperSchema = z.object({
  note: z.string(),
  asOf: isoDate,
  profile: z.object({
    id: z.string(),
    name: z.string(),
    email: z.string(),
    memberSince: isoDate,
    preferredStoreId: z.string(),
  }),
  ownedParts: z.array(
    z.object({
      sku: z.string(),
      orderId: z.string(),
      purchasedOn: isoDate,
    }),
  ),
  orders: z.array(
    z.object({
      id: z.string(),
      date: isoDate,
      fulfillment: z.enum(["shipped", "pickup"]),
      storeId: z.string().nullable(),
      items: z.array(
        z.object({
          sku: z.string(),
          qty: z.number().int().positive(),
          price: z.number().nonnegative(),
          warrantyExpiresOn: isoDate.nullable(),
        }),
      ),
    }),
  ),
  stores: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      address: z.string(),
      window: z.string(),
      readyBy: z.string(),
      code: z.string(),
      distanceMiles: z.number().nonnegative(),
      hours: z.string(),
    }),
  ),
  storeStock: z.record(z.string(), z.record(z.string(), z.number().int().nonnegative())),
  warrantyPlans: z.array(
    z.object({
      id: z.string(),
      label: z.string(),
      price: z.number().nonnegative(),
    }),
  ),
});

const sample = shopperSchema.parse(shopperJson);

export const SAMPLE_NOTE = sample.note;
export const SAMPLE_TODAY = sample.asOf;
export const SHOPPER = sample.profile;
export const WARRANTY_PLANS = sample.warrantyPlans;

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;

function utcDay(iso: string): number {
  return Date.parse(`${iso.slice(0, 10)}T00:00:00Z`);
}

export function formatMonthYear(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return iso;
  const year = match[1];
  const month = Number(match[2]);
  return `${MONTHS[month - 1] ?? match[2]} ${year}`;
}

export function formatLongDate(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return iso;
  const year = match[1];
  const month = Number(match[2]);
  const day = Number(match[3]);
  return `${MONTHS[month - 1]} ${day}, ${year}`;
}

function daysFromToday(iso: string): number {
  return Math.round((utcDay(iso) - utcDay(SAMPLE_TODAY)) / 86_400_000);
}

export type WarrantyState = "none" | "active" | "expiring_soon" | "expired";

export function warrantyState(expiresOn: string | null): WarrantyState {
  if (!expiresOn) return "none";
  const days = daysFromToday(expiresOn);
  if (days < 0) return "expired";
  if (days <= 45) return "expiring_soon";
  return "active";
}

export function returnWindow(orderDate: string): { open: boolean; closesOn: string } {
  const closes = new Date(utcDay(orderDate) + 30 * 86_400_000);
  const closesOn = closes.toISOString().slice(0, 10);
  return { open: daysFromToday(closesOn) >= 0, closesOn };
}

export type OwnedPart = {
  sku: string;
  name: string;
  orderId: string;
  purchasedOn: string;
  phrase: string;
};

const ownedBySku = new Map(
  sample.ownedParts.map((owned) => [owned.sku, owned] as const),
);

export function ownedPart(sku: string): OwnedPart | undefined {
  const owned = ownedBySku.get(sku);
  const part = getPart(sku);
  if (!owned || !part) return undefined;
  return {
    sku,
    name: part.name,
    orderId: owned.orderId,
    purchasedOn: owned.purchasedOn,
    phrase: `You own this — purchased ${formatMonthYear(owned.purchasedOn)}`,
  };
}

export function customerProfile() {
  return {
    sample: true,
    asOf: SAMPLE_TODAY,
    ...SHOPPER,
    preferredStore: storeById(SHOPPER.preferredStoreId)?.name ?? SHOPPER.preferredStoreId,
    ownedParts: sample.ownedParts.flatMap((owned) => {
      const resolved = ownedPart(owned.sku);
      return resolved ? [resolved] : [];
    }),
  };
}

export type OrderLine = {
  sku: string;
  name: string;
  qty: number;
  price: number;
  warrantyExpiresOn: string | null;
  warranty: WarrantyState;
};

export type OrderRecord = {
  id: string;
  date: string;
  fulfillment: "shipped" | "pickup";
  storeId: string | null;
  storeName: string | null;
  returnWindowOpen: boolean;
  returnClosesOn: string;
  items: OrderLine[];
};

function storeById(id: string | null): (typeof sample.stores)[number] | undefined {
  if (!id) return undefined;
  return sample.stores.find((store) => store.id === id);
}

function lineName(sku: string): string {
  return getPart(sku)?.name ?? sku;
}

export function orderHistory(): OrderRecord[] {
  return sample.orders.map((order) => {
    const window = returnWindow(order.date);
    return {
      id: order.id,
      date: order.date,
      fulfillment: order.fulfillment,
      storeId: order.storeId,
      storeName: storeById(order.storeId)?.name ?? null,
      returnWindowOpen: window.open,
      returnClosesOn: window.closesOn,
      items: order.items.map((item) => ({
        sku: item.sku,
        name: lineName(item.sku),
        qty: item.qty,
        price: item.price,
        warrantyExpiresOn: item.warrantyExpiresOn,
        warranty: warrantyState(item.warrantyExpiresOn),
      })),
    };
  });
}

export type WarrantyQuote =
  | {
      extendable: true;
      orderId: string;
      sku: string;
      name: string;
      status: WarrantyState;
      expiresOn: string;
      plans: typeof WARRANTY_PLANS;
    }
  | {
      extendable: false;
      orderId: string;
      sku: string;
      name: string;
      status: WarrantyState;
      expiresOn: string | null;
      reason: string;
    };

export function findOrderItem(orderId: string, sku: string): { order: OrderRecord; item: OrderLine } | undefined {
  const order = orderHistory().find((entry) => entry.id === orderId);
  const item = order?.items.find((entry) => entry.sku === sku);
  if (!order || !item) return undefined;
  return { order, item };
}

export function warrantyStatus(orderId: string, sku: string): WarrantyQuote | { error: string } {
  const found = findOrderItem(orderId, sku);
  if (!found) return { error: `No item ${sku} on ${orderId}` };
  const { item } = found;
  if (item.warranty === "expired") {
    return {
      extendable: false,
      orderId,
      sku,
      name: item.name,
      status: item.warranty,
      expiresOn: item.warrantyExpiresOn,
      reason: `This protection plan expired on ${formatLongDate(item.warrantyExpiresOn ?? "")} and cannot be extended.`,
    };
  }
  if (item.warranty === "none" || !item.warrantyExpiresOn) {
    return {
      extendable: false,
      orderId,
      sku,
      name: item.name,
      status: "none",
      expiresOn: null,
      reason: "This item has no protection plan to extend.",
    };
  }
  return {
    extendable: true,
    orderId,
    sku,
    name: item.name,
    status: item.warranty,
    expiresOn: item.warrantyExpiresOn,
    plans: WARRANTY_PLANS,
  };
}

export function quoteWarrantyExtension(orderId: string, sku: string): WarrantyQuote | { error: string } {
  return warrantyStatus(orderId, sku);
}

const RESOLUTIONS = ["return", "exchange", "repair"] as const;
export type Resolution = (typeof RESOLUTIONS)[number];

export function startSupportRequest(input: {
  orderId: string;
  sku: string;
  issueType: string;
  description: string;
  resolution: Resolution;
}):
  | {
      caseId: string;
      orderId: string;
      sku: string;
      name: string;
      issueType: string;
      description: string;
      resolution: Resolution;
      returnWindowOpen: boolean;
      sample: true;
    }
  | { error: string } {
  const description = input.description.trim();
  if (!description) return { error: "description is required" };
  const found = findOrderItem(input.orderId, input.sku);
  if (!found) return { error: `No item ${input.sku} on ${input.orderId}` };
  if (input.resolution === "return" && !found.order.returnWindowOpen) {
    return {
      error: `The return window for ${input.orderId} closed on ${formatLongDate(found.order.returnClosesOn)}. Repair or exchange may still be open.`,
    };
  }
  const suffix = input.orderId.replace(/\D/g, "").slice(-4) || "4821";
  return {
    caseId: `VL-RMA-${suffix}`,
    orderId: input.orderId,
    sku: input.sku,
    name: found.item.name,
    issueType: input.issueType.trim(),
    description,
    resolution: input.resolution,
    returnWindowOpen: found.order.returnWindowOpen,
    sample: true,
  };
}

export type StoreStockLine = {
  storeId: string;
  storeName: string;
  address: string;
  window: string;
  readyBy: string;
  distanceMiles: number;
  hours: string;
  inStock: boolean;
  missing: Array<{ sku: string; name: string }>;
};

function qtyAt(storeId: string, sku: string): number {
  return sample.storeStock[storeId]?.[sku] ?? 0;
}

/** Stock for SKUs the shopper still needs to buy. Owned SKUs are not required on the shelf. */
export function checkStoreStock(skus: string[], storeId?: string): { lines: StoreStockLine[]; unknown: string[] } | { error: string } {
  const unique = [...new Set(skus.map((sku) => sku.trim()).filter(Boolean))];
  if (unique.length === 0) return { error: "at least one sku is required" };
  const unknown = unique.filter((sku) => !getPart(sku));
  if (unknown.length > 0) return { lines: [], unknown };
  const needed = unique.filter((sku) => !ownedBySku.has(sku));
  const stores = storeId ? sample.stores.filter((store) => store.id === storeId) : sample.stores;
  if (storeId && stores.length === 0) return { error: `Unknown store ${storeId}` };
  const lines = stores.map((store) => {
    const missing = needed
      .filter((sku) => qtyAt(store.id, sku) < 1)
      .map((sku) => ({ sku, name: lineName(sku) }));
    return {
      storeId: store.id,
      storeName: store.name,
      address: store.address,
      window: store.window,
      readyBy: store.readyBy,
      distanceMiles: store.distanceMiles,
      hours: store.hours,
      inStock: missing.length === 0,
      missing,
    };
  });
  return { lines, unknown: [] };
}

export type PickupOrder =
  | {
      ok: true;
      sample: true;
      code: string;
      storeId: string;
      storeName: string;
      address: string;
      window: string;
      readyBy: string;
      lines: Array<{ sku: string; name: string; price: number }>;
      total: number;
      broughtByCustomer: string[];
    }
  | { ok: false; error: string; missing?: Array<{ sku: string; name: string }> };

export function placePickupOrder(input: { storeId: string; skus: string[]; window?: string }): PickupOrder {
  const store = storeById(input.storeId);
  if (!store) return { ok: false, error: `Unknown store ${input.storeId}` };
  const unique = [...new Set(input.skus.map((sku) => sku.trim()).filter(Boolean))];
  if (unique.length === 0) return { ok: false, error: "at least one sku is required" };
  const unknown = unique.filter((sku) => !getPart(sku));
  if (unknown.length > 0) return { ok: false, error: `Unknown SKU ${unknown[0]}` };
  const broughtByCustomer = unique.filter((sku) => ownedBySku.has(sku));
  const buying = unique.filter((sku) => !ownedBySku.has(sku));
  if (buying.length === 0) return { ok: false, error: "Nothing to reserve. Those parts are already owned." };
  const missing = buying
    .filter((sku) => qtyAt(store.id, sku) < 1)
    .map((sku) => ({ sku, name: lineName(sku) }));
  if (missing.length > 0) {
    const names = missing.map((item) => item.name).join(", ");
    return {
      ok: false,
      error: `${store.name} is out of stock for ${names}.`,
      missing,
    };
  }
  const lines = buying.flatMap((sku) => {
    const part: Part | undefined = getPart(sku);
    return part ? [{ sku, name: part.name, price: part.price }] : [];
  });
  return {
    ok: true,
    sample: true,
    code: store.code,
    storeId: store.id,
    storeName: store.name,
    address: store.address,
    window: input.window?.trim() || store.window,
    readyBy: store.readyBy,
    lines,
    total: lines.reduce((sum, line) => sum + line.price, 0),
    broughtByCustomer,
  };
}

export { RESOLUTIONS };
