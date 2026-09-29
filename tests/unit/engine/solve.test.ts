import { describe, expect, it } from "vitest";
import { formatEquation } from "@/engine/format";
import { generateInstance } from "@/engine/generate";
import { solutionSteps } from "@/engine/solve";
import type { ProblemInstance } from "@/engine/types";
import { FIXTURES } from "./fixtures";

const base = { templateKey: "example", seed: 0 };

describe("formatEquation", () => {
  it.each<[ProblemInstance, string]>([
    [
      { ...base, structure: "one-step", form: "multiply", solution: -4, values: { a: 3, c: -12 } },
      "3x = -12",
    ],
    [
      { ...base, structure: "one-step", form: "multiply", solution: 6, values: { a: -1, c: -6 } },
      "-x = -6",
    ],
    [
      { ...base, structure: "one-step", form: "add", solution: 5, values: { b: -8, c: -3 } },
      "x - 8 = -3",
    ],
    [
      { ...base, structure: "one-step", form: "add", solution: -9, values: { b: 4, c: -5 } },
      "x + 4 = -5",
    ],
    [{ ...base, structure: "two-step", solution: 5, values: { a: 3, b: 5, c: 20 } }, "3x + 5 = 20"],
    [
      { ...base, structure: "two-step", solution: 2, values: { a: -1, b: -4, c: -6 } },
      "-x - 4 = -6",
    ],
    [
      { ...base, structure: "both-sides", solution: 5, values: { a: 5, b: -7, c: 2, d: 8 } },
      "5x - 7 = 2x + 8",
    ],
    [
      { ...base, structure: "both-sides", solution: 1, values: { a: 1, b: 2, c: -1, d: 4 } },
      "x + 2 = -x + 4",
    ],
    [
      { ...base, structure: "distribution", solution: 5, values: { a: 3, b: -4, c: 2, d: 13 } },
      "3(x - 4) + 2x = 13",
    ],
    [
      { ...base, structure: "distribution", solution: 2, values: { a: -1, b: 3, c: -2, d: -9 } },
      "-(x + 3) - 2x = -9",
    ],
  ])("formats %#", (instance, expected) => {
    expect(formatEquation(instance)).toBe(expected);
  });
});

describe("solutionSteps", () => {
  it("solves a one-step equation with one inverse operation", () => {
    expect(
      solutionSteps({
        ...base,
        structure: "one-step",
        form: "multiply",
        solution: 7,
        values: { a: -4, c: -28 },
      }),
    ).toEqual([{ description: "Divide both sides by -4", equationAfter: "x = 7" }]);
    expect(
      solutionSteps({
        ...base,
        structure: "one-step",
        form: "add",
        solution: 5,
        values: { b: -8, c: -3 },
      }),
    ).toEqual([{ description: "Add 8 to both sides", equationAfter: "x = 5" }]);
  });

  it("solves a two-step equation", () => {
    expect(
      solutionSteps({ ...base, structure: "two-step", solution: 5, values: { a: 3, b: 5, c: 20 } }),
    ).toEqual([
      { description: "Subtract 5 from both sides", equationAfter: "3x = 15" },
      { description: "Divide both sides by 3", equationAfter: "x = 5" },
    ]);
  });

  it("solves variables on both sides", () => {
    expect(
      solutionSteps({
        ...base,
        structure: "both-sides",
        solution: 5,
        values: { a: 5, b: -7, c: 2, d: 8 },
      }),
    ).toEqual([
      { description: "Subtract 2x from both sides", equationAfter: "3x - 7 = 8" },
      { description: "Add 7 to both sides", equationAfter: "3x = 15" },
      { description: "Divide both sides by 3", equationAfter: "x = 5" },
    ]);
  });

  it("solves a distribution equation", () => {
    expect(
      solutionSteps({
        ...base,
        structure: "distribution",
        solution: 5,
        values: { a: 3, b: -4, c: 2, d: 13 },
      }),
    ).toEqual([
      { description: "Distribute 3", equationAfter: "3x - 12 + 2x = 13" },
      { description: "Combine like terms", equationAfter: "5x - 12 = 13" },
      { description: "Add 12 to both sides", equationAfter: "5x = 25" },
      { description: "Divide both sides by 5", equationAfter: "x = 5" },
    ]);
  });

  it("skips the division when the coefficient is already 1", () => {
    expect(
      solutionSteps({
        ...base,
        structure: "both-sides",
        solution: 4,
        values: { a: 3, b: -2, c: 2, d: 2 },
      }),
    ).toEqual([
      { description: "Subtract 2x from both sides", equationAfter: "x - 2 = 2" },
      { description: "Add 2 to both sides", equationAfter: "x = 4" },
    ]);
  });

  it("divides by a negative coefficient and moves a negative x-term", () => {
    expect(
      solutionSteps({
        ...base,
        structure: "both-sides",
        solution: 3,
        values: { a: -4, b: 5, c: -2, d: -1 },
      }),
    ).toEqual([
      { description: "Add 2x to both sides", equationAfter: "-2x + 5 = -1" },
      { description: "Subtract 5 from both sides", equationAfter: "-2x = -6" },
      { description: "Divide both sides by -2", equationAfter: "x = 3" },
    ]);
  });

  it("ends every generated instance at x = solution", () => {
    for (const template of FIXTURES) {
      for (let seed = 0; seed < 200; seed += 1) {
        const instance = generateInstance(template, seed);
        const steps = solutionSteps(instance);
        expect(steps.at(-1)?.equationAfter).toBe(`x = ${instance.solution}`);
        if (instance.structure === "one-step") expect(steps).toHaveLength(1);
      }
    }
  });
});
