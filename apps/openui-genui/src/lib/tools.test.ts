import { describe, expect, test } from "bun:test";
import { executeGetWeather, weatherInputSchema } from "@/lib/tools";

describe("get_weather input", () => {
  test("rejects an empty location", () => {
    const parsed = weatherInputSchema.safeParse({ location: "   " });
    expect(parsed.success).toBe(false);
  });

  test("the executor reports an empty location without calling the network", async () => {
    const original = globalThis.fetch;
    globalThis.fetch = (() => {
      throw new Error("fetch should not run");
    }) as unknown as typeof fetch;
    try {
      const result = await executeGetWeather({ location: "" });
      expect(result).toContain("location is required");
    } finally {
      globalThis.fetch = original;
    }
  });
});
