import type { ProblemInstance } from "@/engine/types";

/** `k` times `body` as written by hand: `3x`, `x`, `-x`, `2(x + 1)`, `-(x + 1)`. */
function scaled(k: number, body: string): string {
  if (k === 1) return body;
  if (k === -1) return `-${body}`;
  return `${k}${body}`;
}

export function xTerm(coefficient: number): string {
  return scaled(coefficient, "x");
}

/** Joins signed terms: `["3x", "-5"]` becomes `3x - 5`. */
export function sum(terms: string[]): string {
  return terms
    .map((term, i) => {
      if (i === 0) return term;
      return term.startsWith("-") ? `- ${term.slice(1)}` : `+ ${term}`;
    })
    .join(" ");
}

/** `kx + m`, dropping a zero constant. */
export function linear(coefficient: number, constant: number): string {
  return constant === 0 ? xTerm(coefficient) : sum([xTerm(coefficient), String(constant)]);
}

/** The instance's equation as a student would see it, e.g. `3(x - 4) + 2x = 11`. */
export function formatEquation(instance: ProblemInstance): string {
  switch (instance.structure) {
    case "two-step": {
      const { a, b, c } = instance.values;
      return `${linear(a, b)} = ${c}`;
    }
    case "both-sides": {
      const { a, b, c, d } = instance.values;
      return `${linear(a, b)} = ${linear(c, d)}`;
    }
    case "distribution": {
      const { a, b, c, d } = instance.values;
      const group = scaled(a, `(${linear(1, b)})`);
      return `${sum([group, xTerm(c)])} = ${d}`;
    }
  }
}
