import { describe, expect, test } from "bun:test";
import { createParser, type LibraryJSONSchema } from "@openuidev/lang-core";
import spec from "@/generated/spec.json";
import {
  fallbackProgram,
  gamingProgram,
  matchDemo,
  ordersProgram,
  pickupProgram,
  supportProgram,
  upgradeProgram,
  warrantyProgram,
} from "@/lib/mock-lang";
import { getPart, ratingLabel } from "@/lib/catalog";
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
  test("the gaming build, chart, form, orders, warranty, and pickup parse", () => {
    const gaming = gamingProgram();
    expect(gaming).toContain("Card(");
    expect(gaming).toContain("ImageBlock(");
    expect(gaming).toContain("You own this — purchased Mar 2025");
    expect(gaming).toContain("SingleStackedBarChart(");
    expect(gaming).toContain("RadialChart(");
    expect(gaming).toContain("Form(");
    expect(gaming).toContain("Slider(");
    expect(gaming).not.toContain("Table(");
    expectValid(gaming);

    const upgrade = upgradeProgram();
    expect(upgrade).toContain("Card(");
    expect(upgrade).toContain("BarChart(");
    expect(upgrade).toContain("Table(");
    expectValid(upgrade);

    const orders = ordersProgram();
    expect(orders).toContain("VL-ORD-1901");
    expect(orders).toContain("Card(");
    expect(orders).toContain("Steps(");
    expect(orders).not.toContain("Table(");
    expectValid(orders);

    const warranty = warrantyProgram();
    expect(warranty).toContain("Your protection plan on Kiln View 27 expires Nov 5, 2026");
    expect(warranty).toContain("Card(");
    expect(warranty).not.toContain("Table(");
    expectValid(warranty);

    const support = supportProgram();
    expect(support).toContain("Form(");
    expect(support).toContain("Card(");
    expect(support).toContain("VL-RMA-2140");
    expectValid(support);

    const pickup = pickupProgram();
    expect(pickup).toContain("HBR-7741");
    expect(pickup).toContain("Card(");
    expect(pickup).toContain("/parts/pickup-mark.svg");
    expect(pickup).not.toContain("Table(");
    expectValid(pickup);

    expectValid(fallbackProgram());
  });

  test("card ratings come from the catalog", () => {
    const gpu = getPart("VL-GPU-4070S");
    const ram = getPart("VL-RAM-32D5");
    const keyboard = getPart("VL-KEY-TKL");
    expect(gpu).toBeDefined();
    expect(ram).toBeDefined();
    expect(keyboard).toBeDefined();
    const gaming = gamingProgram();
    expect(gaming).toContain(ratingLabel(gpu!));
    expect(gaming).toContain(ratingLabel(ram!));
    expect(upgradeProgram()).toContain(ratingLabel(gpu!));
    expect(warrantyProgram()).toContain(ratingLabel(getPart("VL-MON-27")!));
    expect(supportProgram()).toContain(ratingLabel(keyboard!));
  });

  test("each starter prompt maps to a program", () => {
    for (const starter of STARTERS) {
      const match = matchDemo(starter.prompt);
      expect(match.kind).toBe("program");
      expectValid(match.source);
    }
  });
});
