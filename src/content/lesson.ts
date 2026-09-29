import { formatEquation } from "@/engine/format";
import { generateInstance } from "@/engine/generate";
import { solutionSteps } from "@/engine/solve";
import type { ValidTemplate } from "@/engine/types";

export interface LessonStep {
  label: string;
  /** The equation after the step. */
  equation: string;
  /** Why the step works, in plain words. */
  reason: string;
}

/** A worked example as the student steps through it. */
export interface WorkedExample {
  equation: string;
  /** Each solution step with why it works, then the answer checked in the original equation. */
  steps: readonly LessonStep[];
}

interface WorkedExampleSource {
  /** Pin every range to one value so the example cannot drift from the text written for it. */
  template: ValidTemplate;
  seed: number;
  /** Why each step of `solutionSteps` works, one entry per step, in order. */
  reasons: readonly string[];
  /** The answer put back into the original equation, shown after the last step. */
  check: { equation: string; reason: string };
}

/**
 * Builds a worked example when its content module loads, so reasons that do not match the steps
 * fail the build and tests rather than a page render.
 */
export function defineWorkedExample(source: WorkedExampleSource): WorkedExample {
  const instance = generateInstance(source.template, source.seed);
  const steps = solutionSteps(instance);
  if (steps.length !== source.reasons.length) {
    throw new Error(
      `Worked example "${source.template.key}" has ${steps.length} steps but ${source.reasons.length} reasons`,
    );
  }
  return {
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
