import { coachContext } from "@/coach/prompt";
import { generateInstance } from "@/engine/generate";
import { createRng } from "@/engine/random";
import type { Interest } from "@/engine/types";
import type { SessionProblem } from "@/session/problems";

/** A worked example the panel shows once the hints run out: like the problem, with other numbers. */
export interface SimilarExample {
  text: string;
  equation: string;
  steps: readonly { label: string; equation: string }[];
}

// A template whose solution range is one value can only repeat it. Enough tries for real ones.
const MAX_TRIES = 32;

/**
 * The same template with a different seed and a different solution, so the example's last step
 * never spells out the student's answer. Same block and index, so it renders in the same
 * interest. The constant is derived from the solution, so a new solution means new numbers.
 */
export function similarProblem(problem: SessionProblem): SessionProblem {
  const { solution } = generateInstance(problem.template, problem.seed);
  let seed = problem.seed;
  for (let attempt = 0; attempt < MAX_TRIES; attempt += 1) {
    // Each candidate seed is drawn from the last one with the engine's own generator.
    seed = createRng(seed).int(0, 2 ** 32 - 1);
    if (generateInstance(problem.template, seed).solution !== solution) break;
  }
  return { ...problem, seed };
}

/** The similar problem rendered for the student, with every step to its answer. */
export function exampleFor(
  problem: SessionProblem,
  interests: readonly Interest[],
): SimilarExample {
  const { problem: rendered, equation, steps } = coachContext(similarProblem(problem), interests);
  return {
    text: rendered.text,
    equation,
    steps: steps.map((step) => ({ label: step.description, equation: step.equationAfter })),
  };
}
