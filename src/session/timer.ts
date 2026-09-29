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
