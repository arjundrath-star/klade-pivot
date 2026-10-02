import { lastCompletion, lockInputs } from "@/db/queries/lock";
import { calendarDay, phoneClock } from "@/parent/progress";
import { lockState, nextLockDay, type LockRuleFields, type LockState } from "@/session/lock";
import { sessionRewards } from "@/session/rewards";

/** What the phone panel shows, as GET /api/lock-state returns it. */
export type LockView = LockState & {
  /** The rule the phone runs, as the parent set it; null without one. */
  rule: (LockRuleFields & { enabled: boolean }) | null;
  /** The lock's clock on the phone's lock screen: "5:05" and "Thursday, October 1". */
  time: string;
  date: string;
  /** The first day after the lock's clock the rule locks on, for what the open screen says. */
  nextLockDay: string | null;
  /**
   * What the session that unlocked the phone earned: its XP and the streak after it. Worked out
   * only when asked for, since only the poll that sees the unlock shows it.
   */
  reward: { xp: number; streak: number } | null;
};

/**
 * The student's phone as of `now`. The family's demo clock, when set, stands in for `now` as the
 * lock's clock (the day and the hour the rule reads). Whether today's session is done and whether
 * tonight's unlock is running are always real time, so a demo on any day unlocks the moment that
 * day's session is finished, and an unlock ends at the real midnight.
 */
export async function lockView(
  studentId: string,
  now = new Date(),
  { reward = false } = {},
): Promise<LockView> {
  const [inputs, last] = await Promise.all([lockInputs(studentId), lastCompletion(studentId)]);
  const doneToday = last !== undefined && calendarDay(last.completedAt) === calendarDay(now);
  const rule = inputs?.rule ?? null;
  const clock = inputs?.demoClock ?? now;
  const state = lockState(rule, clock, doneToday ? "done" : "not-done", now);
  const earned =
    reward && state.reason === "session-done" && inputs && last
      ? await sessionRewards(
          { id: last.id, studentId, sessionDays: inputs.sessionDays },
          last.completedAt,
        )
      : null;
  return {
    ...state,
    rule: rule && {
      enabled: rule.enabled,
      days: rule.days,
      startTime: rule.startTime,
      categories: rule.categories,
      weekendOff: rule.weekendOff,
    },
    ...phoneClock(clock),
    nextLockDay: rule ? nextLockDay(rule, calendarDay(clock)) : null,
    reward: earned && { xp: earned.xp, streak: earned.streak.after.count },
  };
}
