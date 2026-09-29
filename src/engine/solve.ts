import { linear, sum, xTerm } from "@/engine/format";
import type { ProblemInstance, SolutionStep } from "@/engine/types";

/** The inverse operation that removes the term `show(value)` from one side. */
function undo(value: number, show: (n: number) => string): string {
  return value > 0
    ? `Subtract ${show(value)} from both sides`
    : `Add ${show(-value)} to both sides`;
}

/** The final division, skipped when the coefficient is already 1. */
function isolate(coefficient: number, solution: number): SolutionStep[] {
  if (coefficient === 1) return [];
  return [{ description: `Divide both sides by ${coefficient}`, equationAfter: `x = ${solution}` }];
}

/** The standard ordered solution, one inverse operation per step, ending at `x = solution`. */
export function solutionSteps(instance: ProblemInstance): SolutionStep[] {
  const x = instance.solution;
  switch (instance.structure) {
    case "two-step": {
      const { a, b, c } = instance.values;
      return [
        { description: undo(b, String), equationAfter: `${xTerm(a)} = ${c - b}` },
        ...isolate(a, x),
      ];
    }
    case "both-sides": {
      const { a, b, c, d } = instance.values;
      const k = a - c;
      return [
        { description: undo(c, xTerm), equationAfter: `${linear(k, b)} = ${d}` },
        { description: undo(b, String), equationAfter: `${xTerm(k)} = ${d - b}` },
        ...isolate(k, x),
      ];
    }
    case "distribution": {
      const { a, b, c, d } = instance.values;
      const k = a + c;
      const ab = a * b;
      return [
        {
          description: a === 1 ? "Remove the parentheses" : `Distribute ${a}`,
          equationAfter: `${sum([xTerm(a), String(ab), xTerm(c)])} = ${d}`,
        },
        { description: "Combine like terms", equationAfter: `${linear(k, ab)} = ${d}` },
        { description: undo(ab, String), equationAfter: `${xTerm(k)} = ${d - ab}` },
        ...isolate(k, x),
      ];
    }
  }
}
