import { describe, expect, it } from "vitest";
import { checkAnswer } from "@/engine/check";
import { generateInstance } from "@/engine/generate";
import { rational } from "@/engine/rational";
import type { IntRange, ProblemInstance } from "@/engine/types";
import { FIXTURES } from "./fixtures";

const SEEDS = Array.from({ length: 200 }, (_, i) => i * 7919 + 1);

function holds(instance: ProblemInstance, x: number): boolean {
  switch (instance.structure) {
    case "one-step":
      return instance.form === "multiply"
        ? instance.values.a * x === instance.values.c
        : x + instance.values.b === instance.values.c;
    case "two-step": {
      const { a, b, c } = instance.values;
      return a * x + b === c;
    }
    case "both-sides": {
      const { a, b, c, d } = instance.values;
      return a * x + b === c * x + d;
    }
    case "distribution": {
      const { a, b, c, d } = instance.values;
      return a * (x + b) + c * x === d;
    }
  }
}

function within(value: number, range: IntRange): boolean {
  return Number.isInteger(value) && value >= range.min && value <= range.max;
}

describe.each(FIXTURES)("generateInstance for $key", (template) => {
  const instances = SEEDS.map((seed) => generateInstance(template, seed));

  it("gives every instance an integer solution that satisfies its equation", () => {
    for (const instance of instances) {
      expect(instance.structure).toBe(template.structure);
      expect(Number.isInteger(instance.solution)).toBe(true);
      expect(holds(instance, instance.solution)).toBe(true);
      expect(holds(instance, instance.solution + 1)).toBe(false);
    }
  });

  it("passes every instance through its own checker", () => {
    for (const { solution } of instances) {
      const expected = rational(solution);
      expect(checkAnswer(String(solution), expected).correct).toBe(true);
      expect(checkAnswer(`x = ${solution}`, expected).correct).toBe(true);
      expect(checkAnswer(String(solution + 1), expected).correct).toBe(false);
    }
  });

  it("draws values from the template ranges with non-degenerate coefficients", () => {
    const ranges: Record<string, IntRange> = template.ranges;
    const drawn = Object.keys(ranges).filter((name) => name !== "x");
    for (const instance of instances) {
      expect(within(instance.solution, ranges.x)).toBe(true);
      const values: Record<string, number> = instance.values;
      for (const name of drawn) {
        expect(within(values[name], ranges[name]) && values[name] !== 0).toBe(true);
      }
      if (instance.structure === "one-step" && instance.form === "multiply") {
        expect(instance.values.a).not.toBe(1);
      }
      if (instance.structure === "both-sides") {
        expect(instance.values.a).not.toBe(instance.values.c);
      }
      if (instance.structure === "distribution") {
        expect(instance.values.a + instance.values.c).not.toBe(0);
      }
    }
  });

  it("replays an instance exactly from its seed", () => {
    for (const instance of instances.slice(0, 20)) {
      expect(generateInstance(template, instance.seed)).toEqual(instance);
    }
  });

  it("varies across seeds", () => {
    expect(
      new Set(instances.map((instance) => JSON.stringify(instance.values))).size,
    ).toBeGreaterThan(50);
  });
});

describe("generateInstance performance", () => {
  it("generates 1,000 instances across every structure in under 50 ms", () => {
    // Warm the JIT so the budget measures generation, not first-call compilation.
    for (let i = 0; i < 30; i += 1) generateInstance(FIXTURES[i % FIXTURES.length], i);
    const started = performance.now();
    for (let i = 0; i < 1000; i += 1) generateInstance(FIXTURES[i % FIXTURES.length], i);
    expect(performance.now() - started).toBeLessThan(50);
  });
});
