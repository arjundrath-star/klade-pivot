import { formatEquation } from "@/engine/format";
import { generateInstance } from "@/engine/generate";
import { renderProblem } from "@/engine/render";
import { solutionSteps } from "@/engine/solve";
import { defineTemplate } from "@/engine/template";
import type { ProblemTemplate, ValidTemplate } from "@/engine/types";

export interface LessonStep {
  label: string;
  /** The equation after the step. */
  equation: string;
  /** Why the step works, in plain words. */
  reason: string;
}

/** A worked example as the student steps through it. */
export interface WorkedExample {
  /** The problem as the student reads it: the neutral story for a word problem, else the prompt. */
  text: string;
  kind: "symbolic" | "word";
  equation: string;
  /** Each solution step with why it works, then the answer checked in the original equation. */
  steps: readonly LessonStep[];
}

interface WorkedExampleSource<T extends ProblemTemplate> {
  /** The session template the example is cut from, so the example and practice tell one story. */
  template: ValidTemplate<T>;
  /** One value for each of the template's ranges: the numbers the reasons were written for. */
  values: Readonly<Record<keyof T["ranges"], number>>;
  /** Why each step of `solutionSteps` works, one entry per step, in order. */
  reasons: readonly string[];
  /** The answer put back into the original equation, shown after the last step. */
  check: { equation: string; reason: string };
}

/**
 * Builds a worked example when its content module loads: the template pinned to the given values
 * and validated again, so the example never drifts from the text written for it, and reasons that
 * do not match the generated steps fail the build and tests rather than a page render.
 */
export function defineWorkedExample<T extends ProblemTemplate>(
  source: WorkedExampleSource<T>,
): WorkedExample {
  const { template, values } = source;
  const ranges = Object.fromEntries(
    Object.entries<number>(values).map(([name, value]) => [name, { min: value, max: value }]),
  ) as T["ranges"];
  const pinned = defineTemplate({ ...template, key: `${template.key}:example`, ranges });
  // Every range holds one value, so any seed draws the same instance.
  const instance = generateInstance(pinned, 1);
  const steps = solutionSteps(instance);
  if (steps.length !== source.reasons.length) {
    throw new Error(
      `Worked example "${template.key}" has ${steps.length} steps but ${source.reasons.length} reasons`,
    );
  }
  const rendered = renderProblem(pinned, instance, [], 0);
  return {
    text: rendered.text,
    kind: rendered.kind,
    equation: formatEquation(instance),
    steps: [
      ...steps.map((step, i) => ({
        label: step.description,
        equation: step.equationAfter,
        reason: source.reasons[i],
      })),
      {
        label: `Check: put ${instance.solution} back in for x`,
        equation: source.check.equation,
        reason: source.check.reason,
      },
    ],
  };
}
