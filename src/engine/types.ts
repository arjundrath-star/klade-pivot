export const INTERESTS = ["sports", "music", "gaming", "food", "creators", "animals"] as const;

export type Interest = (typeof INTERESTS)[number];

/** Inclusive integer range. */
export interface IntRange {
  min: number;
  max: number;
}

/**
 * The equation shapes: one-step for the S1 warm-up, then the S1/S2/S3 shapes. The unknown is
 * always `x`.
 * - `one-step`:     ax = c (form `multiply`) or x + b = c (form `add`)
 * - `two-step`:     ax + b = c
 * - `both-sides`:   ax + b = cx + d
 * - `distribution`: a(x + b) + cx = d
 */
export type Structure = "one-step" | "two-step" | "both-sides" | "distribution";

/**
 * Ranges for the values drawn at random. The last constant (`c` for one-step and two-step, `d`
 * otherwise) is derived from the drawn solution so every instance has an integer answer.
 */
type FourRanges = { a: IntRange; b: IntRange; c: IntRange; x: IntRange };

type StructureSpec =
  | { structure: "one-step"; form: "multiply"; ranges: { a: IntRange; x: IntRange } }
  | { structure: "one-step"; form: "add"; ranges: { b: IntRange; x: IntRange } }
  | { structure: "two-step"; ranges: { a: IntRange; b: IntRange; x: IntRange } }
  | { structure: "both-sides"; ranges: FourRanges }
  | { structure: "distribution"; ranges: FourRanges };

type WordVariants = Record<Interest, string> & { neutral: string };

type Presentation =
  { kind: "symbolic"; variants: { neutral: string } } | { kind: "word"; variants: WordVariants };

export type ProblemTemplate = { key: string } & StructureSpec & Presentation;

declare const validated: unique symbol;

/** A template that passed `defineTemplate`: every draw succeeds and every placeholder resolves. */
export type ValidTemplate<T extends ProblemTemplate = ProblemTemplate> = T & {
  readonly [validated]: true;
};

type TwoStepValues = { a: number; b: number; c: number };

type FourValues = { a: number; b: number; c: number; d: number };

export type ProblemInstance = {
  templateKey: string;
  /** Replaying `generateInstance(template, seed)` reproduces this instance exactly. */
  seed: number;
  /** Always an integer. */
  solution: number;
} & (
  | { structure: "one-step"; form: "multiply"; values: { a: number; c: number } }
  | { structure: "one-step"; form: "add"; values: { b: number; c: number } }
  | { structure: "two-step"; values: TwoStepValues }
  | { structure: "both-sides"; values: FourValues }
  | { structure: "distribution"; values: FourValues }
);

export interface AnswerCheck {
  correct: boolean;
  /** Canonical form of the student's answer (`"5"`, `"-3/2"`), or null when it did not parse. */
  normalized: string | null;
  expected: string;
}

export interface SolutionStep {
  description: string;
  equationAfter: string;
}
