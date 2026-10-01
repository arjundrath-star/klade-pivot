import { BLOCKS, type BlockId } from "@/session/blocks";

/** Milliseconds spent in each block on earlier visits. */
export type BlockTimes = Partial<Record<BlockId, number>>;

export const TIMER_MODES = ["standard", "extended", "untimed"] as const;

export type TimerMode = (typeof TIMER_MODES)[number];

// Extended time is the common "time and a half" accommodation.
const EXTENDED_FACTOR = 1.5;

/** Seconds the student is budgeted for a block, or null when the student is untimed. */
export function blockBudgetSeconds(block: BlockId, mode: TimerMode): number | null {
  if (mode === "untimed") return null;
  return Math.round(BLOCKS[block].minutes * 60 * (mode === "extended" ? EXTENDED_FACTOR : 1));
}

/** Seconds a standard-time student gets for each exit-check problem (spec §3.2 block 5). */
const EXIT_PROBLEM_SECONDS = 90;

/** Seconds the student gets for each exit-check problem, or null when the student is untimed. */
export function exitProblemSeconds(mode: TimerMode): number | null {
  if (mode === "untimed") return null;
  return EXIT_PROBLEM_SECONDS * (mode === "extended" ? EXTENDED_FACTOR : 1);
}

// An answer typed as the countdown hits zero still has to reach the server.
const EXIT_GRACE_MS = 2000;

/** Longest time an attempt records; a tab left open overnight counts as an hour. */
export const MAX_ATTEMPT_MS = 60 * 60 * 1000;

/** `ms` as an attempt records it: never negative, never over an hour. */
export function attemptMs(ms: number): number {
  return Math.min(Math.max(ms, 0), MAX_ATTEMPT_MS);
}

/** Time left on an exit-check problem shown `elapsedMs` ago, or null when the student is untimed. */
export function exitRemainingMs(elapsedMs: number, mode: TimerMode): number | null {
  const seconds = exitProblemSeconds(mode);
  return seconds === null ? null : seconds * 1000 - elapsedMs;
}

/** Whether an exit-check answer `elapsedMs` after its problem was shown came after the deadline. */
export function isExitAnswerLate(elapsedMs: number, mode: TimerMode): boolean {
  const seconds = exitProblemSeconds(mode);
  return seconds !== null && elapsedMs > seconds * 1000 + EXIT_GRACE_MS;
}

/** `m:ss` for a non-negative number of seconds. */
export function formatClock(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

function sinceMs(start: Date | null, now: Date): number {
  return start === null ? 0 : Math.max(0, now.getTime() - start.getTime());
}

/** Total time in `block` so far: earlier visits plus the visit that started at `enteredAt`. */
export function timeInBlock(
  times: BlockTimes,
  block: BlockId,
  enteredAt: Date | null,
  now = new Date(),
): number {
  return (times[block] ?? 0) + sinceMs(enteredAt, now);
}

/** The block times after leaving `block`, adding the visit that started at `enteredAt`. */
export function leaveBlock(
  times: BlockTimes,
  block: BlockId,
  enteredAt: Date | null,
  now = new Date(),
): BlockTimes {
  return { ...times, [block]: timeInBlock(times, block, enteredAt, now) };
}
