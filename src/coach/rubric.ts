/** The explain-back rubric (spec §5) and the pass rule. No server code: the panel imports this too. */

export const CRITERIA = ["correctness", "justification", "precision"] as const;

export type Criterion = (typeof CRITERIA)[number];

export const CRITERION_LABELS: Readonly<Record<Criterion, string>> = {
  correctness: "Correctness",
  justification: "Justification",
  precision: "Precision",
};

/** Each criterion is scored 0 to 3. */
export const MAX_CRITERION_SCORE = 3;

export type RubricScores = Readonly<Record<Criterion, number>>;

/** The best total: every criterion at full marks. */
export const MAX_TOTAL_SCORE = CRITERIA.length * MAX_CRITERION_SCORE;

/** Pass: at least 5 of 9 in total and no zero on correctness. */
export const PASS_TOTAL = 5;

export function totalScore(scores: RubricScores): number {
  return CRITERIA.reduce((sum, criterion) => sum + scores[criterion], 0);
}

export function passes(scores: RubricScores): boolean {
  return totalScore(scores) >= PASS_TOTAL && scores.correctness > 0;
}

/** A failing first try earns exactly one retry; the second result stands. */
export const EXPLAIN_ATTEMPTS = 2;

/** Long enough for a spoken walk through two steps, short enough to keep grading cheap. */
export const MAX_EXPLANATION_LENGTH = 1500;

/** How a student can give an explanation. */
export const EXPLAIN_SOURCES = ["voice", "typed"] as const;

/** How an explain-back row came to be: a student's graded explanation, or an admin override. */
export const EXPLAIN_RECORD_SOURCES = [...EXPLAIN_SOURCES, "override"] as const;

export const EXPLAIN_VERDICTS = ["pass", "fail"] as const;

export type ExplainVerdict = (typeof EXPLAIN_VERDICTS)[number];

/** One graded attempt, as the student sees it. */
export interface ExplainResult {
  attempt: number;
  scores: RubricScores;
  feedback: string;
  verdict: ExplainVerdict;
}

/**
 * Where a session's explain-back stands: not graded yet, one failing try with a retry owed, or
 * final. Both final states unlock the exit check; only "passed" counts toward mastery.
 */
export type ExplainStatus = "pending" | "retry" | "passed" | "failed";

export function isExplainFinal(status: ExplainStatus): boolean {
  return status === "passed" || status === "failed";
}

export function explainStatus(verdicts: readonly ExplainVerdict[]): ExplainStatus {
  if (verdicts.includes("pass")) return "passed";
  if (verdicts.length >= EXPLAIN_ATTEMPTS) return "failed";
  return verdicts.length === 0 ? "pending" : "retry";
}

/** Why an explanation was not graded. The panel maps each one to a message or a reload. */
export type ExplainError =
  "invalid" | "unavailable" | "closed" | "wrong-block" | "graded" | "rate-limited";
