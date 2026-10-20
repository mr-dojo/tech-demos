import { describe, expect, test } from "bun:test";
import { buildSystemPrompt } from "@/lib/prompt";

describe("buildSystemPrompt", () => {
  test("mentions a library component and the weather tool", () => {
    const prompt = buildSystemPrompt();
    expect(prompt).toContain("Table");
    expect(prompt).toContain("BarChart");
    expect(prompt).toContain("get_weather");
    expect(prompt.length).toBeGreaterThan(200);
  });
});
