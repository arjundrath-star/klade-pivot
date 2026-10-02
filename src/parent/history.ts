/** A session row as the parent's history and the student's recent sessions read it. Pure. */
import { calendarDay } from "@/parent/progress";
import type { BlockId } from "@/session/blocks";
import type { SessionOutcome } from "@/session/mastery";

export interface HistoryRow {
  status: string;
  outcome: SessionOutcome | null;
  /** YYYY-MM-DD on a schedule row; null on a session the student opened. */
  scheduledFor: string | null;
  startedAt: Date | null;
  completedAt: Date | null;
  blockElapsedMs: Partial<Record<BlockId, number>>;
}

/** The family's calendar day the row is for: the schedule day, else the day the session ran. */
export function historyDay(row: HistoryRow): string {
  if (row.scheduledFor !== null) return row.scheduledFor;
  const at = row.completedAt ?? row.startedAt;
  return at ? calendarDay(at) : "";
}

/** "Mastered", "Repeat", "Missed" or "In progress"; "Done" for a session closed before verdicts. */
export function historyResult(row: HistoryRow): string {
  if (row.status === "missed") return "Missed";
  if (row.status === "in_progress") return "In progress";
  if (row.outcome === "mastered") return "Mastered";
  return row.outcome === "repeat" ? "Repeat" : "Done";
}

/** The rows with the day each is for, latest first. */
export function sortedHistory<T extends HistoryRow>(rows: readonly T[]): { row: T; day: string }[] {
  return rows
    .map((row) => ({ row, day: historyDay(row) }))
    .sort((a, b) => b.day.localeCompare(a.day));
}

/** Minutes the student spent across the session's blocks. */
export function historyMinutes(row: HistoryRow): number {
  const ms = Object.values(row.blockElapsedMs).reduce((sum, value) => sum + (value ?? 0), 0);
  return Math.round(ms / 60_000);
}

/** "2 skipped (demo)" for a session where a demo driver skipped problems, else null. */
export function skippedNote(skipped: number): string | null {
  return skipped === 0 ? null : `${skipped} skipped (demo)`;
}
