import { describe, expect, test } from "bun:test";
import { createParser, type LibraryJSONSchema } from "@openuidev/lang-core";
import spec from "@/generated/spec.json";
import { DEMO_PROGRAMS, fallbackProgram, matchDemo, weatherProgram } from "@/lib/mock-lang";
import { STARTERS } from "@/lib/starters";

const parser = createParser(spec.schema as LibraryJSONSchema, spec.root);

function expectValid(source: string) {
  const result = parser.parse(source);
  expect(result.root).not.toBeNull();
  expect(result.meta.incomplete).toBe(false);
  expect(result.meta.errors).toEqual([]);
  expect(result.meta.unresolved).toEqual([]);
  expect(result.meta.orphaned).toEqual([]);
}

describe("canned OpenUI Lang", () => {
  test("table, chart, and form programs parse", () => {
    expect(DEMO_PROGRAMS.planets).toContain("Table(");
    expect(DEMO_PROGRAMS.dashboard).toContain("BarChart(");
    expect(DEMO_PROGRAMS.signup).toContain("Form(");
    expectValid(DEMO_PROGRAMS.planets);
    expectValid(DEMO_PROGRAMS.dashboard);
    expectValid(DEMO_PROGRAMS.signup);
    expectValid(DEMO_PROGRAMS.laptops);
    expectValid(DEMO_PROGRAMS.interest);
    expectValid(fallbackProgram());
    expectValid(
      weatherProgram({
        place: "Berlin, Germany",
        temperature_c: 12.5,
        conditions: "partly cloudy",
        wind_kmh: 14,
      }),
    );
  });

  test("each starter prompt maps to a program or a weather lookup", () => {
    for (const starter of STARTERS) {
      const match = matchDemo(starter.prompt);
      if (starter.id === "weather") {
        expect(match.kind).toBe("weather");
      } else {
        expect(match.kind).toBe("program");
        if (match.kind === "program") expectValid(match.source);
      }
    }
  });
});
