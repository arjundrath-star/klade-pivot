import { MAX_TOTAL_SCORE, totalScore } from "@/coach/rubric";
import { ALGEBRA1_BADGES, ALGEBRA1_CONTENT } from "@/content/algebra1/concepts";
import { masteredConcepts, sessionEarnings, type XpGrant } from "@/db/queries/rewards";
import {
  earnedBadges,
  streak,
  xpAward,
  XP_KINDS,
  type Badge,
  type Streak,
  type XpAward,
} from "@/engine/progress";
import { calendarDay } from "@/parent/progress";
import { isBlockComplete, type BlockId } from "@/session/blocks";
import type { LoadedSession } from "@/session/load";
import { EXIT_PASS_MARK, type SessionOutcome } from "@/session/mastery";
import { scheduleRecord } from "@/session/pace";

/** The streak at the start of the day a session finished, and just after it finished. */
export interface StreakChange {
  before: Streak;
  after: Streak;
  /** The day the session finished is on the student's schedule. */
  sessionDay: boolean;
  /** An earlier session the same day already counted for it. */
  alreadyCounted: boolean;
}

/** What a finished session earned, for the session-complete screen. */
export interface SessionRewards {
  xp: number;
  awards: XpAward[];
  streak: StreakChange;
  /** Badges this session was the first to earn, in shelf order. */
  badges: Badge[];
}

/**
 * The XP that leaving `block` with Next pays, judged from the stored progress: the warm-up once
 * every problem is solved, guided practice per problem solved (all of them, once it is complete),
 * the explain-back only when it passed.
 */
export function blockXp(
  block: BlockId,
  { session, counts, progress }: LoadedSession,
): XpGrant | null {
  if (!isBlockComplete(block, counts, progress)) return null;
  const grant = (award: XpAward) => ({
    studentId: session.studentId,
    sessionLogId: session.id,
    ...award,
  });
  if (block === "warmup") return grant(xpAward("warmup"));
  if (block === "guided") return grant(xpAward("guided", counts.guided));
  if (block === "explain" && progress.explainBack === "passed") return grant(xpAward("explain"));
  return null;
}

/** The student whose session finished, as `loadSession` returns them. */
type FinishedBy = Pick<LoadedSession["session"], "id" | "studentId" | "sessionDays">;

/**
 * The streak change for the session that finished at `completedAt`, counting only sessions that
 * finished before it, so it reads the same before the session is stored, right after, and on any
 * later reload. "Before" is the streak going into that day, so a day marked missed earlier and
 * then done does not show as a spent freeze.
 */
async function streakChange(session: FinishedBy, completedAt: Date): Promise<StreakChange> {
  const day = calendarDay(completedAt);
  const { schedule, completed } = await scheduleRecord(session.studentId, day, session.sessionDays);
  const earlier = completed.filter((at) => at.getTime() < completedAt.getTime()).map(calendarDay);
  return {
    before: streak(
      schedule.filter((slot) => slot.day < day),
      earlier,
      day,
    ),
    after: streak(schedule, [...earlier, day], day),
    sessionDay: schedule.some((slot) => slot.day === day),
    alreadyCounted: earlier.includes(day),
  };
}

/**
 * What the session finished at `completedAt` earned, read back from what was stored. `change` is
 * the streak change when the caller already worked it out.
 */
export async function sessionRewards(
  session: FinishedBy,
  completedAt: Date,
  change?: StreakChange,
): Promise<SessionRewards> {
  const [earned, streakAfter] = await Promise.all([
    sessionEarnings(session.id),
    change ?? streakChange(session, completedAt),
  ]);
  return {
    xp: earned.xp.reduce((total, award) => total + award.amount, 0),
    // In the order the session pays them.
    awards: earned.xp.toSorted((a, b) => XP_KINDS.indexOf(a.kind) - XP_KINDS.indexOf(b.kind)),
    streak: streakAfter,
    badges: ALGEBRA1_BADGES.filter((badge) => earned.badges.includes(badge.key)),
  };
}

/** The session's passing explain-back scored the top mark on every criterion. */
function explainedPerfectly({ explain }: LoadedSession): boolean {
  return explain.results.some(
    ({ verdict, scores }) => verdict === "pass" && totalScore(scores) === MAX_TOTAL_SCORE,
  );
}

/**
 * What finishing the session at `completedAt` with `outcome` pays, worked out before the session
 * is stored so `finishSession` can write it in the same batch: the exit-check XP when the check
 * passed, and every badge the student's mastery, streak and this session's explanation will
 * qualify for once it is done.
 */
export async function sessionAwards(
  loaded: LoadedSession,
  outcome: SessionOutcome,
  exitCorrect: number,
  completedAt: Date,
): Promise<{ xp: XpGrant | null; badges: string[]; change: StreakChange }> {
  const { session } = loaded;
  const [change, mastered] = await Promise.all([
    streakChange(session, completedAt),
    masteredConcepts(session.studentId),
  ]);
  if (outcome === "mastered") mastered.add(session.contentKey);
  const badges = earnedBadges(ALGEBRA1_CONTENT, {
    mastered,
    streak: change.after.count,
    perfectExplanation: explainedPerfectly(loaded),
  });
  return {
    xp:
      exitCorrect >= EXIT_PASS_MARK
        ? { studentId: session.studentId, sessionLogId: session.id, ...xpAward("exit") }
        : null,
    badges: badges.map((badge) => badge.key),
    change,
  };
}
