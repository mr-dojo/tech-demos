import { describe, expect, test } from "bun:test";
import { EXPIRED_WARRANTY, GAMING_BUILD, GAMING_PICKUP_SKUS, OUT_OF_STOCK_STORE_ID, PICKUP_STORE_ID } from "@/lib/builds";
import { placePickupOrder, quoteWarrantyExtension } from "@/lib/shopper";
import { checkCompatibility, priceBuild, runTool, searchPartsSchema } from "@/lib/tools";

describe("Voltline tools", () => {
  test("search_parts rejects a missing category", () => {
    const parsed = searchPartsSchema.safeParse({});
    expect(parsed.success).toBe(false);
    expect(runTool("search_parts", {})).toEqual(expect.objectContaining({ error: expect.any(String) }));
  });

  test("compatibility catches a socket mismatch", () => {
    const result = checkCompatibility({ cpu: "VL-CPU-7600", motherboard: "VL-MB-Z790" });
    const socket = result.checks.find((check) => check.id === "socket");
    expect(socket?.status).toBe("fail");
    expect(socket?.detail).toContain("AM5");
    expect(socket?.detail).toContain("LGA1700");
  });

  test("compatibility catches an underpowered PSU", () => {
    const result = checkCompatibility({
      cpu: "VL-CPU-7800X3D",
      gpu: "VL-GPU-4080S",
      psu: "VL-PSU-450",
    });
    const psu = result.checks.find((check) => check.id === "psu");
    expect(psu?.status).toBe("fail");
    expect(psu?.title).toBe("PSU underpowered");
  });

  test("owned parts are excluded from the build total", () => {
    const priced = priceBuild(GAMING_BUILD);
    const owned = priced.lines.filter((line) => line.owned);
    expect(owned.length).toBeGreaterThan(0);
    expect(owned.every((line) => line.countedInTotal === false)).toBe(true);
    expect(owned.some((line) => line.note.startsWith("You own this — purchased Mar 2025"))).toBe(true);
    const ownedSum = owned.reduce((sum, line) => sum + line.price, 0);
    expect(priced.ownedValue).toBe(ownedSum);
    expect(priced.total).toBe(priced.lines.reduce((sum, line) => sum + line.price, 0) - ownedSum);

    const included = priceBuild({ ...GAMING_BUILD, includeOwned: true });
    expect(included.total).toBe(priced.total + ownedSum);
  });

  test("pickup fails when the store is out of stock", () => {
    const missing = placePickupOrder({ storeId: OUT_OF_STOCK_STORE_ID, skus: [...GAMING_PICKUP_SKUS] });
    expect(missing.ok).toBe(false);
    if (!missing.ok) expect(missing.error).toContain("out of stock");

    const reserved = placePickupOrder({ storeId: PICKUP_STORE_ID, skus: [...GAMING_PICKUP_SKUS] });
    expect(reserved.ok).toBe(true);
    if (reserved.ok) {
      expect(reserved.code).toMatch(/^HBR-/);
      expect(reserved.total).toBe(priceBuild(GAMING_BUILD).total);
    }
  });

  test("an expired warranty cannot be extended", () => {
    const quote = quoteWarrantyExtension(EXPIRED_WARRANTY.orderId, EXPIRED_WARRANTY.sku);
    expect("extendable" in quote && quote.extendable).toBe(false);
    if ("extendable" in quote && !quote.extendable) {
      expect(quote.status).toBe("expired");
      expect(quote.reason).toContain("cannot be extended");
    }
  });
});
