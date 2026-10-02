import { MAX_TOTAL_SCORE, totalScore } from "@/coach/rubric";
import { ALGEBRA1_BADGES } from "@/content/algebra1/badges";
import { ALGEBRA1_COURSE } from "@/content/algebra1/course";
import { masteredConcepts, sessionEarnings, type XpGrant } from "@/db/queries/rewards";
import {
  reachedRewards,
  REWARD_KEYS,
  REWARDS,
  type Reward,
  type RewardKey,
} from "@/content/rewards";
import { rewardRows } from "@/db/queries/reward-progress";
import type { ScheduleSlot } from "@/engine/pace";
import {
  earnedBadges,
  streak,
  streakSpan,
  xpAward,
  XP_KINDS,
  type Badge,
  type Streak,
  type XpAward,
} from "@/engine/progress";
import { calendarDay } from "@/parent/progress";
import { isBlockComplete, solvedCount, type BlockId } from "@/session/blocks";
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
  /** Completion rewards this session unlocked. */
  unlocks: Reward[];
}

/**
 * The XP that leaving `block` with Next pays, judged from the stored progress: the warm-up once
 * every problem is solved, guided practice per problem solved, the explain-back only when it
 * passed. A problem skipped in a demo settles the block's gate but was never solved, so it pays
 * nothing: a warm-up with a skip pays no XP, and guided practice pays for its solved problems only.
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
  if (block === "warmup") {
    const all = solvedCount(block, counts, progress.solved) === counts.warmup;
    return all ? grant(xpAward("warmup")) : null;
  }
  if (block === "guided") {
    const solved = solvedCount(block, counts, progress.solved);
    return solved > 0 ? grant(xpAward("guided", solved)) : null;
  }
  if (block === "explain" && progress.explainBack === "passed") return grant(xpAward("explain"));
  return null;
}

/** The student whose session finished, as `loadSession` returns them. */
type FinishedBy = Pick<LoadedSession["session"], "id" | "studentId" | "sessionDays">;

/** The schedule on the day a session finished, and the days sessions finished before it. */
interface FinishRecord {
  day: string;
  schedule: ScheduleSlot[];
  earlier: string[];
}

async function finishRecord(session: FinishedBy, completedAt: Date): Promise<FinishRecord> {
  const day = calendarDay(completedAt);
  const { schedule, completed } = await scheduleRecord(session.studentId, day, session.sessionDays);
  const earlier = completed.filter((at) => at.getTime() < completedAt.getTime()).map(calendarDay);
  return { day, schedule, earlier };
}

/**
 * The streak change for the session that finished on `day`, counting only sessions that finished
 * before it, so it reads the same before the session is stored, right after, and on any later
 * reload. "Before" is the streak going into that day, so a day marked missed earlier and then done
 * does not show as a spent freeze.
 */
function streakChange({ day, schedule, earlier }: FinishRecord): StreakChange {
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
    change ?? finishRecord(session, completedAt).then(streakChange),
  ]);
  return {
    xp: earned.xp.reduce((total, award) => total + award.amount, 0),
    // In the order the session pays them.
    awards: earned.xp.toSorted((a, b) => XP_KINDS.indexOf(a.kind) - XP_KINDS.indexOf(b.kind)),
    streak: streakAfter,
    badges: ALGEBRA1_BADGES.filter((badge) => earned.badges.includes(badge.key)),
    unlocks: REWARD_KEYS.filter((key) => earned.unlocks.includes(key)).map((key) => REWARDS[key]),
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
 * passed, every badge the student's mastery, streak and this session's explanation will qualify
 * for once it is done, and every completion reward the streak after it puts at its target. A
 * student with no reward rows unlocks nothing.
 */
export async function sessionAwards(
  loaded: LoadedSession,
  outcome: SessionOutcome,
  exitCorrect: number,
  completedAt: Date,
): Promise<{
  xp: XpGrant | null;
  badges: string[];
  unlocks: RewardKey[];
  change: StreakChange;
}> {
  const { session } = loaded;
  const [record, mastered, rows] = await Promise.all([
    finishRecord(session, completedAt),
    masteredConcepts(session.studentId),
    rewardRows(session.studentId),
  ]);
  const change = streakChange(record);
  const done = [...record.earlier, record.day];
  const span = streakSpan(record.schedule, done, record.day, change.after.count);
  if (outcome === "mastered") mastered.add(session.contentKey);
  const badges = earnedBadges(ALGEBRA1_COURSE, {
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
    unlocks: reachedRewards(rows, {
      streakWeeks: span.weeks,
      streakBroken: span.broken,
      sessionsDone: done.length,
    }),
    change,
  };
}
