/** The hint ladder and the words around it. No server code: the panel imports this too. */

/** Hints a problem gets before the panel shows a similar worked example instead (spec §3.3). */
export const MAX_HINT_LEVEL = 3;

/** Coach calls one session may make. The hint ladder caps each problem; this caps the bill. */
export const COACH_CALLS_PER_SESSION = 12;

export type HintLevel = 1 | 2 | 3;

const HINT_LEVELS: readonly HintLevel[] = [1, 2, 3];

/** The level of the next hint for a problem that has had `hintsUsed`, or null once they are used up. */
export function hintLevel(hintsUsed: number): HintLevel | null {
  return hintsUsed < MAX_HINT_LEVEL ? HINT_LEVELS[hintsUsed] : null;
}

/** One exchange with the coach, as the student saw it. */
export interface CoachTurn {
  level: number;
  student: string;
  coach: string;
}

/** The student's first line when the coach opens: the wrong answer if they gave one, else stuck. */
export function openingMessage(wrongAnswer: string | null): string {
  return wrongAnswer === null ? "I'm stuck." : `I tried ${wrongAnswer} and it was marked wrong.`;
}

/** Why the route refused a coach call. The panel maps each one to a message or a reload. */
export const COACH_ERRORS = [
  "invalid",
  "unavailable",
  "not-found",
  "closed",
  "wrong-block",
  "solved",
  "skipped",
  "exhausted",
  "rate-limited",
] as const;

export type CoachError = (typeof COACH_ERRORS)[number];

export function isCoachError(value: unknown): value is CoachError {
  return typeof value === "string" && (COACH_ERRORS as readonly string[]).includes(value);
}
