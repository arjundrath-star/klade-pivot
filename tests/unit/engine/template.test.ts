import { describe, expect, it } from "vitest";
import { defineTemplate, templateIssues } from "@/engine/template";
import { INTERESTS, type Interest, type ProblemTemplate } from "@/engine/types";

const symbolic = { kind: "symbolic", variants: { neutral: "Solve for x." } } as const;

function wordVariants(text: string) {
  const keys = [...INTERESTS, "neutral"] as const;
  return Object.fromEntries(keys.map((key) => [key, text])) as Record<Interest | "neutral", string>;
}

const twoStep = {
  key: "two-step",
  structure: "two-step",
  ranges: { a: { min: 2, max: 9 }, b: { min: 1, max: 9 }, x: { min: 1, max: 9 } },
  ...symbolic,
} satisfies ProblemTemplate;

const multiply = {
  key: "one-step-multiply",
  structure: "one-step",
  form: "multiply",
  ranges: { a: { min: -9, max: 9 }, x: { min: -9, max: 9 } },
  ...symbolic,
} satisfies ProblemTemplate;

const add = {
  key: "one-step-add",
  structure: "one-step",
  form: "add",
  ranges: { b: { min: -9, max: 9 }, x: { min: -9, max: 9 } },
  ...symbolic,
} satisfies ProblemTemplate;

function withC(
  structure: "both-sides" | "distribution",
  a: [number, number],
  c: [number, number],
): ProblemTemplate {
  return {
    key: structure,
    structure,
    ranges: {
      a: { min: a[0], max: a[1] },
      b: { min: 1, max: 9 },
      c: { min: c[0], max: c[1] },
      x: { min: 1, max: 9 },
    },
    ...symbolic,
  };
}

describe("templateIssues", () => {
  it("accepts well-formed templates", () => {
    expect(templateIssues(multiply)).toEqual([]);
    expect(templateIssues(add)).toEqual([]);
    expect(templateIssues(twoStep)).toEqual([]);
    expect(templateIssues(withC("both-sides", [2, 5], [1, 3]))).toEqual([]);
    expect(templateIssues(withC("distribution", [2, 5], [-4, 4]))).toEqual([]);
  });

  it("rejects empty or non-integer ranges", () => {
    expect(
      templateIssues({ ...twoStep, ranges: { ...twoStep.ranges, x: { min: 5, max: 1 } } }),
    ).toEqual(["range x is empty (min > max)"]);
    expect(
      templateIssues({ ...twoStep, ranges: { ...twoStep.ranges, a: { min: 1.5, max: 3 } } }),
    ).toEqual(["range a must have integer bounds"]);
  });

  it("rejects coefficient ranges that only contain zero", () => {
    expect(
      templateIssues({ ...twoStep, ranges: { ...twoStep.ranges, b: { min: 0, max: 0 } } }),
    ).toEqual(["range b has no nonzero value"]);
  });

  it("rejects one-step ranges that leave nothing to undo", () => {
    expect(
      templateIssues({ ...multiply, ranges: { ...multiply.ranges, a: { min: 0, max: 1 } } }),
    ).toEqual(["range a has no value other than 0 and 1"]);
    expect(
      templateIssues({ ...multiply, ranges: { ...multiply.ranges, a: { min: -1, max: 1 } } }),
    ).toEqual([]);
    expect(templateIssues({ ...add, ranges: { ...add.ranges, b: { min: 0, max: 0 } } })).toEqual([
      "range b has no nonzero value",
    ]);
  });

  it("allows only the placeholders of the one-step form", () => {
    expect(templateIssues({ ...multiply, variants: { neutral: "{a} {b} {c}" } })).toEqual([
      "variant neutral has unknown placeholder {b}",
    ]);
    expect(templateIssues({ ...add, variants: { neutral: "{a} {b} {c}" } })).toEqual([
      "variant neutral has unknown placeholder {a}",
    ]);
  });

  it("rejects c ranges with no allowed value for some drawable a", () => {
    expect(templateIssues(withC("both-sides", [2, 5], [0, 1]))).toEqual([]);
    expect(templateIssues(withC("both-sides", [1, 5], [0, 1]))).toEqual([
      "range c has no allowed value when a = 1",
    ]);
    expect(templateIssues(withC("distribution", [2, 5], [-1, 0]))).toEqual([]);
    expect(templateIssues(withC("distribution", [2, 5], [-3, -3]))).toEqual([
      "range c has no allowed value when a = 3",
    ]);
  });

  it("rejects ranges whose derived constants could lose integer precision", () => {
    expect(
      templateIssues({ ...twoStep, ranges: { ...twoStep.ranges, x: { min: 1, max: 90071992 } } }),
    ).toEqual(["range x must stay between -1000 and 1000"]);
  });

  it("requires positive numbers in word problems", () => {
    const word = { kind: "word", variants: wordVariants("{a} {b} {c}") } as const;
    expect(templateIssues({ ...twoStep, ...word })).toEqual([]);
    expect(
      templateIssues({
        ...twoStep,
        ...word,
        ranges: { ...twoStep.ranges, b: { min: -9, max: 9 } },
      }),
    ).toEqual(["word problem range b must be positive"]);
    expect(templateIssues({ ...withC("both-sides", [2, 5], [1, 3]), ...word })).toEqual([
      "word problem range a must sit above range c so d stays positive",
    ]);
    expect(templateIssues({ ...withC("both-sides", [4, 5], [1, 3]), ...word })).toEqual([]);
    expect(templateIssues({ ...add, kind: "word", variants: wordVariants("{b} {c}") })).toEqual([
      "word problem range b must be positive",
      "word problem range x must be positive",
    ]);
  });

  it("rejects unknown placeholders and empty variants", () => {
    expect(
      templateIssues({ ...twoStep, variants: { neutral: "Use {a}, {b}, {c}, {d} and {x}." } }),
    ).toEqual([
      "variant neutral has unknown placeholder {d}",
      "variant neutral has unknown placeholder {x}",
    ]);
    expect(templateIssues({ ...twoStep, variants: { neutral: "Solve {a for x}" } })).toEqual([
      "variant neutral has unknown placeholder {a for x}",
    ]);
    expect(templateIssues({ ...twoStep, variants: { neutral: "Solve {a} for x}" } })).toEqual([
      "variant neutral has a stray brace",
    ]);
    expect(templateIssues({ ...twoStep, variants: { neutral: "  " } })).toEqual([
      "variant neutral is empty",
    ]);
  });
});

describe("defineTemplate", () => {
  it("returns a valid template unchanged", () => {
    expect(defineTemplate(twoStep)).toBe(twoStep);
  });

  it("throws with every issue listed", () => {
    expect(() => defineTemplate({ ...twoStep, key: "", variants: { neutral: "{e}" } })).toThrow(
      'Invalid problem template "": key is empty; variant neutral has unknown placeholder {e}',
    );
  });
});
