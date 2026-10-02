import { twoStepChapter, TWO_STEP_EXAMPLE } from "@/content/algebra1/linear-equations/s1-chapter";
import {
  addEqualGroups,
  exitTwoStep,
  growByRate,
  itemsPlusFee,
  negativeCoefficient,
  saveTowardGoal,
  shareWithLeftover,
  twoStep,
  warmupAdd,
  warmupMultiply,
  warmupMultiplyNegative,
} from "@/content/algebra1/linear-equations/s1-templates";
import type { SessionContent } from "@/content/types";

// Session 1: two-step equations. The templates live in s1-templates.ts, the chapter in
// s1-chapter.ts; this is the session the planner opens.

export const s1: SessionContent = {
  // Warm-up: one-step equations with negative numbers, the prerequisites for two-step solving.
  warmup: [warmupAdd, warmupMultiply, warmupMultiplyNegative],
  learn: {
    // The coach's prompt cites these paragraphs and this example as the lesson, in its cached
    // prefix, and the red-teamed transcripts in docs/eval were made against them.
    explanation: [
      "An equation is like a balanced scale: the two sides are equal. Solving it means finding the number that x stands for.",
      "In a two-step equation, two things happen to x. It gets multiplied by a number, and then a number is added or subtracted.",
      "To get x by itself, undo those two things in reverse order. First undo the adding or subtracting. Then undo the multiplying by dividing.",
      "Whatever you do to one side, do the same thing to the other side. That keeps the equation balanced.",
    ],
    example: TWO_STEP_EXAMPLE,
    chapter: twoStepChapter,
  },
  guided: [twoStep, addEqualGroups, growByRate, negativeCoefficient, itemsPlusFee],
  // Exit check: new templates only, so the check measures the skill, not memory of a problem.
  exit: [exitTwoStep, shareWithLeftover, saveTowardGoal],
};
