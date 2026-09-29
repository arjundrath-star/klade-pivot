import { describe, expect, it } from "vitest";
import { defineTemplate } from "@/engine/template";
import { defineWorkedExample } from "@/content/lesson";

const template = defineTemplate({
  key: "lesson-two-step",
  structure: "two-step",
  ranges: { a: { min: 2, max: 9 }, b: { min: 1, max: 9 }, x: { min: 1, max: 9 } },
  kind: "symbolic",
  variants: { neutral: "Solve for x." },
});

const check = { equation: "the check", reason: "why it holds" };

describe("defineWorkedExample", () => {
  it("pairs each solution step with its reason and ends with the check", () => {
    const { equation, steps } = defineWorkedExample({
      template,
      seed: 3,
      reasons: ["one", "two"],
      check,
    });
    expect(equation).toMatch(/^\dx \+ \d = \d+$/);
    expect(steps.map((s) => s.reason)).toEqual(["one", "two", "why it holds"]);
    expect(steps[1].equation).toMatch(/^x = \d$/);
    expect(steps[2]).toMatchObject({ equation: "the check" });
    expect(steps[2].label).toMatch(/^Check: put \d back in for x$/);
  });

  it("refuses content whose reasons do not match the steps", () => {
    expect(() => defineWorkedExample({ template, seed: 3, reasons: ["only one"], check })).toThrow(
      'Worked example "lesson-two-step" has 2 steps but 1 reasons',
    );
  });
});
