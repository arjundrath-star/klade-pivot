import { describe, expect, it } from "vitest";
import {
  reachedRewards,
  REWARD_KEYS,
  rewardBoard,
  REWARDS,
  type LiveProgress,
  type RewardRow,
} from "@/content/rewards";

const ROWS: RewardRow[] = [
  { key: "course-on-time", current: 5, target: 120, unlocked: false },
  { key: "unit-on-time", current: 5, target: 14, unlocked: false },
  { key: "streak-4-weeks", current: 3, target: 4, unlocked: false },
  { key: "intensive-pace", current: 0, target: 4, unlocked: false },
];

/** Live numbers: a streak covering `streakWeeks`, unbroken, and no sessions finished. */
function live(streakWeeks: number, more: Partial<LiveProgress> = {}): LiveProgress {
  return { streakWeeks, streakBroken: false, sessionsDone: 0, ...more };
}

/** The board entry for `key` with the live numbers. */
function entry(key: RewardRow["key"], progress: LiveProgress, rows = ROWS) {
  return rewardBoard(rows, progress).find((e) => e.reward.key === key);
}

describe("the reward definitions", () => {
  it("define every key once, each with both lines and a cap", () => {
    expect(Object.keys(REWARDS).sort()).toEqual([...REWARD_KEYS].sort());
    for (const key of REWARD_KEYS) {
      const reward = REWARDS[key];
      expect(reward.key).toBe(key);
      for (const text of [reward.trigger, reward.parent, reward.kid, reward.cap]) {
        expect(text.length).toBeGreaterThan(0);
      }
    }
  });

  it("pay in our own product, never in cash or gift cards", () => {
    for (const key of REWARD_KEYS) {
      const { parent, kid } = REWARDS[key];
      expect(`${parent} ${kid}`).not.toMatch(/cash|gift card|\$/i);
    }
  });

  it("read live data except for intensive pace", () => {
    expect(REWARD_KEYS.filter((key) => REWARDS[key].live === null)).toEqual(["intensive-pace"]);
    expect(REWARD_KEYS.filter((key) => REWARDS[key].paced)).toEqual(["course-on-time"]);
  });
});

describe("reward progress", () => {
  it("adds the live streak weeks to the seeded start, capped at the target", () => {
    expect(entry("streak-4-weeks", live(0))).toMatchObject({ current: 3, target: 4 });
    expect(entry("streak-4-weeks", live(1))).toMatchObject({ current: 4, target: 4 });
    expect(entry("streak-4-weeks", live(3))).toMatchObject({ current: 4, target: 4 });
  });

  it("drops the seeded weeks once a streak in the record has ended", () => {
    expect(entry("streak-4-weeks", live(1, { streakBroken: true }))).toMatchObject({ current: 1 });
    expect(reachedRewards(ROWS, live(1, { streakBroken: true }))).toEqual([]);
  });

  it("adds finished sessions to the course and the unit", () => {
    expect(entry("course-on-time", live(0, { sessionsDone: 2 }))).toMatchObject({ current: 7 });
    expect(entry("unit-on-time", live(0, { sessionsDone: 2 }))).toMatchObject({ current: 7 });
  });

  it("reads a seeded reward from its row alone", () => {
    expect(entry("intensive-pace", live(9))).toMatchObject({ current: 0, target: 4 });
  });

  it("names the rewards a streak puts at their target, unless already unlocked", () => {
    expect(reachedRewards(ROWS, live(0))).toEqual([]);
    expect(reachedRewards(ROWS, live(1))).toEqual(["streak-4-weeks"]);
    expect(reachedRewards([], live(4))).toEqual([]);
    const unlocked = ROWS.map((row) => ({ ...row, unlocked: true }));
    expect(reachedRewards(unlocked, live(1))).toEqual([]);
  });
});

describe("the reward board", () => {
  it("lists the student's rows in course order", () => {
    const board = rewardBoard(ROWS.toReversed(), live(0));
    expect(board.map((e) => e.reward.key)).toEqual(REWARD_KEYS);
    expect(board.every((e) => !e.unlocked)).toBe(true);
  });

  it("is empty for a student without rows", () => {
    expect(rewardBoard([], live(2))).toEqual([]);
  });

  it("keeps an unlocked reward full after the streak breaks", () => {
    const rows = ROWS.map((row) => ({ ...row, unlocked: row.key === "streak-4-weeks" }));
    expect(entry("streak-4-weeks", live(0), rows)).toMatchObject({
      current: 4,
      target: 4,
      unlocked: true,
    });
  });
});
