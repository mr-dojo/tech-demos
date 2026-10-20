import { describe, expect, test } from "bun:test";
import { buildSystemPrompt } from "@/lib/prompt";

describe("buildSystemPrompt", () => {
  test("mentions a library component and the catalog tools", () => {
    const prompt = buildSystemPrompt();
    expect(prompt).toContain("Table");
    expect(prompt).toContain("product Card");
    expect(prompt).toContain("BarChart");
    expect(prompt).toContain("search_parts");
    expect(prompt).toContain("check_compatibility");
    expect(prompt).toContain("place_pickup_order");
    expect(prompt).not.toContain("get_weather");
    expect(prompt.length).toBeGreaterThan(200);
  });
});
