import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { s1 } from "@/content/algebra1/linear-equations/s1";
import { generateInstance } from "@/engine/generate";
import { renderProblem } from "@/engine/render";
import { INTERESTS, type IntRange, type Interest, type ValidTemplate } from "@/engine/types";
import { renderSessionProblem, sessionProblems } from "@/session/problems";

const SEEDS = Array.from({ length: 200 }, (_, i) => i * 7919 + 3);
const VARIANTS = [...INTERESTS, "neutral"] as const;

const all = [...s1.warmup, ...s1.guided, ...s1.exit];
const words = all.filter((t) => t.kind === "word");

type Bounds = Record<"a" | "b" | "c" | "x", [number, number]>;

// What each value counts in the stories, and the most a kid who knows the topic would believe.
// Widening a template past these fails here, so the variants get reread before the range grows.
const REALISM: Record<string, Bounds> = {
  // a rows, EPs or families; b the starting count; x songs per EP, slices or cats per group.
  "s1-add-equal-groups": { a: [2, 4], b: [4, 12], x: [4, 8], c: [8, 50] },
  // a the weekly or monthly gain; x weeks, shows or months; c a puppy's weight in pounds.
  "s1-grow-by-rate": { a: [2, 5], b: [5, 20], x: [3, 9], c: [10, 70] },
  // a items in one order; b a fee or small extra in dollars; x the price of one item in dollars.
  "s1-items-plus-fee": { a: [2, 5], b: [3, 10], x: [3, 12], c: [9, 75] },
  // a teams, rows or boxes; b the leftovers; x pinnies per team or cookies per box.
  "s1-share-with-leftover": { a: [2, 5], b: [2, 9], x: [4, 10], c: [10, 60] },
  // a dollars saved a week; b dollars saved so far; x weeks; c the price of cleats or headphones.
  "s1-save-toward-goal": { a: [5, 10], b: [20, 40], x: [3, 8], c: [35, 120] },
};

function within(value: number, [min, max]: [number, number]): boolean {
  return value >= min && value <= max;
}

function keys(templates: readonly ValidTemplate[]): string[] {
  return templates.map((t) => t.key);
}

describe("session 1 content", () => {
  it("has 3 warm-up, 5 guided and 3 exit problems with the word-problem minimums", () => {
    expect(s1.warmup).toHaveLength(3);
    expect(s1.guided).toHaveLength(5);
    expect(s1.exit).toHaveLength(3);
    expect(s1.guided.filter((t) => t.kind === "word").length).toBeGreaterThanOrEqual(3);
    expect(s1.exit.filter((t) => t.kind === "word").length).toBeGreaterThanOrEqual(1);
  });

  it("gives every template a unique key", () => {
    expect(new Set(keys(all)).size).toBe(new Set(all).size);
  });

  it("shares no template between the exit check and guided practice", () => {
    const guided = new Set(keys(s1.guided));
    expect(keys(s1.exit).filter((key) => guided.has(key))).toEqual([]);
  });

  it("warms up on one-step equations that practice negative integers", () => {
    for (const template of s1.warmup) {
      expect(template.structure).toBe("one-step");
      expect(template.kind).toBe("symbolic");
    }
    const forms = s1.warmup.map((t) => (t.structure === "one-step" ? t.form : null));
    expect(new Set(forms)).toEqual(new Set(["add", "multiply"]));
    const instances = s1.warmup.flatMap((t) => SEEDS.map((seed) => generateInstance(t, seed)));
    expect(instances.some((i) => i.solution < 0)).toBe(true);
    expect(instances.some((i) => Object.values(i.values).some((v) => v < 0))).toBe(true);
  });

  it("practices two-step equations after the warm-up", () => {
    for (const template of [...s1.guided, ...s1.exit]) {
      expect(template.structure).toBe("two-step");
    }
  });
});

describe("session 1 word problems", () => {
  it.each(words.map((t) => [t.key, t] as const))(
    "%s has all six interest variants plus neutral, each naming a, b and c",
    (_, template) => {
      expect(Object.keys(template.variants).sort()).toEqual([...VARIANTS].sort());
      for (const text of Object.values(template.variants)) {
        for (const token of ["{a}", "{b}", "{c}"]) expect(text).toContain(token);
      }
    },
  );

  it.each(words.map((t) => [t.key, t] as const))(
    "%s renders every variant with no unreplaced placeholder",
    (_, template) => {
      // Substitution does not depend on the values drawn, so one instance covers every seed.
      const instance = generateInstance(template, 1);
      for (const variant of VARIANTS) {
        const interests: Interest[] = variant === "neutral" ? [] : [variant];
        const rendered = renderProblem(template, instance, interests, 0);
        expect(rendered).toMatchObject({ kind: "word", variant });
        expect(rendered.text).not.toMatch(/[{}]/);
      }
    },
  );

  it("has a realism limit for every word problem", () => {
    expect(Object.keys(REALISM).sort()).toEqual(keys(words).sort());
  });

  it.each(words.map((t) => [t.key, t] as const))(
    "%s draws only realistic numbers",
    (key, template) => {
      const bounds = REALISM[key];
      const ranges: Record<string, IntRange> = template.ranges;
      for (const [name, range] of Object.entries(ranges)) {
        const limit = bounds[name as keyof Bounds];
        expect(within(range.min, limit) && within(range.max, limit)).toBe(true);
      }
      // Word problems are two-step with positive ranges, so c = ax + b is extreme at the range ends.
      if (template.structure !== "two-step") throw new Error(`${key} is not a two-step problem`);
      const { a, b, x } = template.ranges;
      expect(within(a.min * x.min + b.min, bounds.c)).toBe(true);
      expect(within(a.max * x.max + b.max, bounds.c)).toBe(true);
    },
  );
});

describe("session 1 interest framing", () => {
  const seed = 20261002;
  const framed = (interests: Interest[]) =>
    sessionProblems(s1, seed)
      .filter((p) => p.block !== "warmup" && p.template.kind === "word")
      .map((p) => ({
        instance: generateInstance(p.template, p.seed),
        rendered: renderSessionProblem(p, interests),
      }));

  it("frames Maya's word problems as sports and music, the same equations as a gamer's", () => {
    const maya = framed(["sports", "music"]);
    const gamer = framed(["gaming"]);
    expect(new Set(maya.map((p) => p.rendered.kind === "word" && p.rendered.variant))).toEqual(
      new Set(["sports", "music"]),
    );
    expect(gamer.every((p) => p.rendered.kind === "word" && p.rendered.variant === "gaming")).toBe(
      true,
    );
    expect(maya.map((p) => p.instance)).toEqual(gamer.map((p) => p.instance));
    maya.forEach((p, i) => expect(p.rendered.text).not.toBe(gamer[i].rendered.text));
  });

  it("shows the neutral variants to a student with no interests", () => {
    expect(
      framed([]).every((p) => p.rendered.kind === "word" && p.rendered.variant === "neutral"),
    ).toBe(true);
  });
});

describe("session 1 lesson", () => {
  it("works 3x + 5 = 20, the equation its reasons and check were written for", () => {
    expect(s1.learn.example).toEqual({
      text: "Solve for x.",
      kind: "symbolic",
      equation: "3x + 5 = 20",
      steps: [
        expect.objectContaining({ label: "Subtract 5 from both sides", equation: "3x = 15" }),
        expect.objectContaining({ label: "Divide both sides by 3", equation: "x = 5" }),
        expect.objectContaining({ label: "Check: put 5 back in for x", equation: "3(5) + 5 = 20" }),
      ],
    });
  });

  it("keeps the explanation short and in short sentences", () => {
    const text = s1.learn.explanation.join(" ");
    const sentences = text.split(/[.!?]\s+/).filter(Boolean);
    const words = text.split(/\s+/);
    expect(words.length).toBeLessThanOrEqual(150);
    expect(words.length / sentences.length).toBeLessThanOrEqual(15);
  });
});

describe("render path", () => {
  const files = (dir: string): string[] =>
    readdirSync(dir, { withFileTypes: true, recursive: true })
      .filter((entry) => entry.isFile() && entry.name.endsWith(".ts"))
      .map((entry) => join(entry.parentPath, entry.name));

  it.each([...files("src/content"), ...files("src/engine")])("%s makes no model call", (file) => {
    expect(readFileSync(file, "utf8")).not.toMatch(/anthropic/i);
  });
});
