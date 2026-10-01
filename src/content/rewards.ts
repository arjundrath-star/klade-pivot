/**
 * Completion rewards (steering §4.1): earned by pace and consistent work, never by scores or speed,
 * and paid in our own product (a free month, a discount, a free mentor check-in), never cash or
 * gift cards. Prototype: nothing here touches billing.
 *
 * Progress lives in `reward_progress` rows (current, target), seeded for the demo student. Where
 * real data exists it is read live instead of trusting the row:
 *
 * - `streak-4-weeks` is real data on top of a seeded start. The row's `current` is seeded: the
 *   weeks the streak ran before the app's records begin. The weeks the live streak covers
 *   (`streakSpan` in src/engine/progress.ts, from 09's `streak`) are added to it, and once a
 *   streak in the record has ended the seeded weeks no longer count.
 * - `course-on-time` and `unit-on-time` are real sessions finished on top of a seeded start (the
 *   sessions done before the records begin). The course's pace line is real: on track or behind
 *   comes from the schedule (07) on every render.
 * - `intensive-pace` is the seeded row alone.
 *
 * A reward unlocks when a finished session leaves its progress at its target (`completeSession`).
 */
export const REWARD_KEYS = [
  "course-on-time",
  "unit-on-time",
  "streak-4-weeks",
  "intensive-pace",
] as const;

export type RewardKey = (typeof REWARD_KEYS)[number];

export interface Reward {
  key: RewardKey;
  /** What earns it. */
  trigger: string;
  /** What the family gets, on the parent view. */
  parent: string;
  /** What the student gets, on the kid's panel. */
  kid: string;
  /** The guardrail that caps it. */
  cap: string;
  /** What the progress counts, singular: "week", "session". */
  counts: string;
  /** The live number added to the seeded row, or none. */
  live: "streakWeeks" | "sessionsDone" | null;
  /** The parent line reads the student's real pace. */
  paced: boolean;
}

export const REWARDS: Readonly<Record<RewardKey, Reward>> = {
  "course-on-time": {
    key: "course-on-time",
    trigger: "Finish Algebra 1 by the target date",
    parent: "First month of Geometry free",
    kid: "Course Complete badge and a shout-out from your mentor",
    cap: "One free month per course.",
    counts: "session",
    live: "sessionsDone",
    paced: true,
  },
  "unit-on-time": {
    key: "unit-on-time",
    trigger: "Finish Unit 1 on or ahead of its deadline",
    parent: "10% off next month",
    kid: "Bonus XP and an extra streak freeze",
    cap: "Discounts stop at 15% off a month.",
    counts: "session",
    live: "sessionsDone",
    paced: false,
  },
  "streak-4-weeks": {
    key: "streak-4-weeks",
    trigger: "4-week streak",
    parent: "One free mentor check-in",
    kid: "Pick your mentor for a free check-in",
    cap: "One free check-in a month.",
    counts: "week",
    live: "streakWeeks",
    paced: false,
  },
  "intensive-pace": {
    key: "intensive-pace",
    trigger: "Keep Intensive pace: 6 sessions a week",
    parent: "15% off the next course",
    kid: "Ahead of Schedule badge",
    cap: "Discounts stop at 15% off a month.",
    counts: "week",
    live: null,
    paced: false,
  },
};

/** A student's `reward_progress` row. */
export interface RewardProgress {
  key: RewardKey;
  current: number;
  target: number;
}

/** The row, and whether the student has unlocked the reward. */
export interface RewardRow extends RewardProgress {
  unlocked: boolean;
}

/** The live numbers rewards read on top of their rows. */
export interface LiveProgress {
  /** Calendar weeks the student's current streak covers. */
  streakWeeks: number;
  /** An earlier streak in the record ended. */
  streakBroken: boolean;
  /** Sessions the student has finished. */
  sessionsDone: number;
}

/** Progress on one reward: the row, plus the live number the reward reads, up to the target. */
function progress(row: RewardProgress, live: LiveProgress): number {
  const source = REWARDS[row.key].live;
  // The seeded weeks stand for a streak that ran before the record; one that ended since is over.
  const seeded = source === "streakWeeks" && live.streakBroken ? 0 : row.current;
  return Math.min(row.target, seeded + (source ? live[source] : 0));
}

/** The rewards not yet unlocked that the rows and the live numbers put at their target. */
export function reachedRewards(rows: readonly RewardRow[], live: LiveProgress): RewardKey[] {
  return REWARD_KEYS.filter((key) => {
    const row = rows.find((r) => r.key === key);
    return row !== undefined && !row.unlocked && progress(row, live) >= row.target;
  });
}

export interface BoardEntry {
  reward: Reward;
  current: number;
  target: number;
  unlocked: boolean;
}

/**
 * Every reward the student has a row for, in course order. An unlocked reward reads full, even if
 * a later break in the streak would take its live progress back down.
 */
export function rewardBoard(rows: readonly RewardRow[], live: LiveProgress): BoardEntry[] {
  return REWARD_KEYS.flatMap((key) => {
    const row = rows.find((r) => r.key === key);
    if (!row) return [];
    const current = row.unlocked ? row.target : progress(row, live);
    return [{ reward: REWARDS[key], current, target: row.target, unlocked: row.unlocked }];
  });
}
