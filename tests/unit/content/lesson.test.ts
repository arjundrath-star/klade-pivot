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

const word = defineTemplate({
  key: "lesson-word",
  structure: "two-step",
  ranges: { a: { min: 2, max: 5 }, b: { min: 1, max: 9 }, x: { min: 1, max: 9 } },
  kind: "word",
  variants: {
    sports: "{a} balls and {b} cones, {c} items.",
    music: "{a} songs and {b} skits, {c} tracks.",
    gaming: "{a} skins and {b} passes, {c} items.",
    food: "{a} pizzas and {b} sodas, {c} items.",
    creators: "{a} clips and {b} intros, {c} files.",
    animals: "{a} cats and {b} dogs, {c} pets.",
    neutral: "{a} boxes and {b} bags, {c} things.",
  },
});

const check = { equation: "the check", reason: "why it holds" };

describe("defineWorkedExample", () => {
  it("pins the template to the values, pairs each step with its reason and ends with the check", () => {
    const example = defineWorkedExample({
      template,
      values: { a: 4, b: 6, x: 7 },
      reasons: ["one", "two"],
      check,
    });
    expect(example).toMatchObject({
      text: "Solve for x.",
      kind: "symbolic",
      equation: "4x + 6 = 34",
    });
    expect(example.steps.map((s) => s.reason)).toEqual(["one", "two", "why it holds"]);
    expect(example.steps.map((s) => s.equation)).toEqual(["4x = 28", "x = 7", "the check"]);
    expect(example.steps[2].label).toBe("Check: put 7 back in for x");
  });

  it("tells a word problem's neutral story, whatever the template's ranges allow", () => {
    const example = defineWorkedExample({
      template: word,
      values: { a: 3, b: 4, x: 9 },
      reasons: ["one", "two"],
      check,
    });
    expect(example).toMatchObject({
      text: "3 boxes and 4 bags, 31 things.",
      kind: "word",
      equation: "3x + 4 = 31",
    });
  });

  it("refuses content whose reasons do not match the steps", () => {
    expect(() =>
      defineWorkedExample({ template, values: { a: 2, b: 1, x: 3 }, reasons: ["only one"], check }),
    ).toThrow('Worked example "lesson-two-step" has 2 steps but 1 reasons');
  });

  it("refuses values the template could never draw, such as a word problem with a negative", () => {
    expect(() =>
      defineWorkedExample({
        template: word,
        values: { a: 3, b: -4, x: 9 },
        reasons: ["", ""],
        check,
      }),
    ).toThrow("word problem range b must be positive");
  });
});
