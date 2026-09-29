import type { SessionContent } from "@/content/types";
import { defineTemplate } from "@/engine/template";

// Temporary two-problem fixture that exercises the session shell. The real session 1 content
// replaces these templates and fills in `exit`; the shape stays the same.

const twoStepSymbolic = defineTemplate({
  key: "s1-fixture-two-step-symbolic",
  structure: "two-step",
  ranges: { a: { min: 2, max: 9 }, b: { min: -15, max: 15 }, x: { min: -10, max: 10 } },
  kind: "symbolic",
  variants: { neutral: "Solve for x." },
});

const twoStepWord = defineTemplate({
  key: "s1-fixture-two-step-word",
  structure: "two-step",
  ranges: { a: { min: 2, max: 4 }, b: { min: 3, max: 12 }, x: { min: 5, max: 12 } },
  kind: "word",
  variants: {
    sports:
      "You ran {b} laps at practice on Monday. On each of the next {a} days you ran the same number of laps, for {c} laps in all. How many laps did you run on each of those days?",
    music:
      "You practiced guitar for {b} minutes on Saturday. Then you practiced the same number of minutes on each of {a} school days, for {c} minutes in all. How many minutes did you practice on each school day?",
    gaming:
      "You had {b} stars before the weekend. You earned the same number of stars in each of {a} levels and ended with {c} stars. How many stars did you earn per level?",
    food: "A bowl has {b} strawberries. You add {a} cartons that each hold the same number of strawberries, and now the bowl has {c}. How many strawberries were in each carton?",
    creators:
      "Your new channel had {b} subscribers. It gained the same number of subscribers on each of the next {a} days and reached {c}. How many subscribers did it gain each day?",
    animals:
      "A pet store has {b} goldfish. It gets {a} bags of goldfish with the same number in each bag, and now it has {c}. How many goldfish were in each bag?",
    neutral:
      "A box holds {b} pencils. You add {a} packs with the same number of pencils in each pack, and now the box holds {c}. How many pencils are in each pack?",
  },
});

export const s1: SessionContent = {
  warmup: [twoStepSymbolic],
  learn: {
    explanation: [
      "A two-step equation takes two moves to solve. Undo the adding or subtracting first, then undo the multiplying.",
      "Whatever you do to one side, do to the other side, so the two sides stay equal.",
    ],
    example: { template: twoStepSymbolic, seed: 7 },
  },
  guided: [twoStepWord],
  exit: [],
};
