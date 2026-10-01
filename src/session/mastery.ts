import type { ExplainStatus } from "@/coach/rubric";

export const MASTERY_STATUSES = ["mastered", "in_progress", "repeat"] as const;

export type MasteryStatus = (typeof MASTERY_STATUSES)[number];

/** How a finished session ends for its concept. */
export const SESSION_OUTCOMES = ["mastered", "repeat"] as const satisfies readonly MasteryStatus[];

export type SessionOutcome = (typeof SESSION_OUTCOMES)[number];

/** Exit-check problems the student must get right, out of the three (spec §3.2 block 5). */
export const EXIT_PASS_MARK = 2;

/**
 * The mastery rule: at least two of the three exit-check problems right and the explain-back
 * passed. Timer modes change the clock, never this rule.
 */
export function masteryVerdict(exitCorrect: number, explainBack: ExplainStatus): SessionOutcome {
  return exitCorrect >= EXIT_PASS_MARK && explainBack === "passed" ? "mastered" : "repeat";
}

/** What the student sees at the end of a session. */
export interface SessionSummary {
  outcome: SessionOutcome;
  exitCorrect: number;
  exitTotal: number;
  explainPassed: boolean;
}
