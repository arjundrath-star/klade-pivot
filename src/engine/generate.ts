import { createRng, type Rng } from "@/engine/random";
import type { IntRange, ProblemInstance, ValidTemplate } from "@/engine/types";

/** `ax = c` with `a = 1` is already solved, so the multiply form skips 1 as well as zero. */
export const EXCLUDED_MULTIPLIERS: readonly number[] = [0, 1];

/**
 * Values `c` may not take once `a` is drawn: zero, plus the value that would cancel the x-terms
 * (`a = c` for both-sides, `a + c = 0` for distribution) and leave no unique solution.
 */
export function excludedC(structure: "both-sides" | "distribution", a: number): number[] {
  return structure === "both-sides" ? [0, a] : [0, -a];
}

function skipsWithin(range: IntRange, excluded: readonly number[]): number[] {
  return excluded.filter((v) => v >= range.min && v <= range.max).sort((x, y) => x - y);
}

/** How many values of `range` are not in `excluded`. */
export function allowedCount(range: IntRange, excluded: readonly number[]): number {
  return range.max - range.min + 1 - skipsWithin(range, excluded).length;
}

function pick(rng: Rng, range: IntRange, excluded: readonly number[] = []): number {
  const skips = skipsWithin(range, excluded);
  let value = rng.int(range.min, range.max - skips.length);
  for (const skip of skips) {
    if (skip <= value) value += 1;
  }
  return value;
}

/**
 * Draws one instance. The solution and the coefficients come from the template's ranges and the
 * last constant is derived, so the solution is always an integer. `a` and `b` are never zero (and
 * a one-step `a` never 1) and `c` avoids `excludedC`, so every equation has exactly one solution
 * and takes every step its structure names.
 */
export function generateInstance(template: ValidTemplate, seed: number): ProblemInstance {
  const rng = createRng(seed);
  const x = pick(rng, template.ranges.x);
  const base = { templateKey: template.key, seed, solution: x };

  if (template.structure === "one-step") {
    if (template.form === "multiply") {
      const a = pick(rng, template.ranges.a, EXCLUDED_MULTIPLIERS);
      return { ...base, structure: "one-step", form: "multiply", values: { a, c: a * x } };
    }
    const b = pick(rng, template.ranges.b, [0]);
    return { ...base, structure: "one-step", form: "add", values: { b, c: x + b } };
  }

  const a = pick(rng, template.ranges.a, [0]);
  const b = pick(rng, template.ranges.b, [0]);

  switch (template.structure) {
    case "two-step":
      return { ...base, structure: "two-step", values: { a, b, c: a * x + b } };
    case "both-sides": {
      const c = pick(rng, template.ranges.c, excludedC("both-sides", a));
      return { ...base, structure: "both-sides", values: { a, b, c, d: (a - c) * x + b } };
    }
    case "distribution": {
      const c = pick(rng, template.ranges.c, excludedC("distribution", a));
      return {
        ...base,
        structure: "distribution",
        values: { a, b, c, d: a * (x + b) + c * x },
      };
    }
  }
}
