import { describe, expect, it } from "vitest";
import { ALGEBRA1_CONTENT } from "@/content/algebra1/concepts";
import { S1_KEY } from "@/content/sessions";
import { scheduleDays, type ScheduleSlot } from "@/engine/pace";
import { freezeLabel, streakLabel } from "@/parent/progress";
import {
  allBadges,
  currentUnit,
  earnedBadges,
  FREEZE_RESTORE_SESSIONS,
  level,
  streak,
  XP_TABLE,
  xpAward,
  type UnitOutline,
} from "@/engine/progress";

describe("the XP table", () => {
  it("pays for blocks completed and gates passed", () => {
    expect(XP_TABLE).toEqual({ warmup: 10, guided: 5, explain: 25, exit: 50 });
  });

  it("pays guided practice per problem solved", () => {
    expect(xpAward("guided", 5)).toEqual({ kind: "guided", amount: 25 });
    expect(xpAward("warmup")).toEqual({ kind: "warmup", amount: 10 });
  });
});

// Mon, Wed, Fri from Monday, Oct 5, 2026: Oct 5, 7, 9, 12, 14, 16, 19, 21, 23, 26, 28, 30.
const DAYS = scheduleDays("2026-10-05", "2026-10-30", ["mon", "wed", "fri"]);
const SLOTS: ScheduleSlot[] = DAYS.map((day) => ({ day, status: "scheduled" }));

/** The schedule's days at `indexes`. */
function days(...indexes: number[]): string[] {
  return indexes.map((index) => DAYS[index]);
}

describe("the streak", () => {
  it("is zero with no schedule, and the freeze starts banked", () => {
    expect(streak([], ["2026-10-05"], "2026-10-05")).toEqual({
      count: 0,
      untilFreeze: 0,
    });
  });

  it("counts scheduled sessions done on their day, in a row", () => {
    expect(streak(SLOTS, days(0, 1, 2), DAYS[2])).toMatchObject({ count: 3, untilFreeze: 0 });
  });

  it("leaves today alone until it is over or marked missed", () => {
    expect(streak(SLOTS, days(0, 1), DAYS[2]).count).toBe(2);
    const marked = SLOTS.map((slot) =>
      slot.day === DAYS[2] ? { ...slot, status: "missed" as const } : slot,
    );
    expect(streak(marked, days(0, 1), DAYS[2])).toEqual({
      count: 2,
      untilFreeze: FREEZE_RESTORE_SESSIONS,
    });
  });

  it("spends the freeze on the first miss and resets on the second", () => {
    expect(streak(SLOTS, days(0, 1, 3), DAYS[3])).toEqual({
      count: 3,
      untilFreeze: FREEZE_RESTORE_SESSIONS - 1,
    });
    expect(streak(SLOTS, days(0, 1, 4), DAYS[4]).count).toBe(1);
  });

  it("resets on a miss when the freeze is already spent", () => {
    // Missed day 2 (freeze), on time 3 and 4, missed 5: the streak ends; 6 starts a new one.
    expect(streak(SLOTS, days(0, 1, 3, 4, 6), DAYS[6])).toEqual({
      count: 1,
      untilFreeze: 2,
    });
  });

  it("banks the freeze again after five on-time sessions", () => {
    const afterMiss = days(0, 2, 3, 4, 5);
    expect(streak(SLOTS, afterMiss, DAYS[5])).toMatchObject({ count: 5, untilFreeze: 1 });
    const restored = streak(SLOTS, [...afterMiss, DAYS[6]], DAYS[6]);
    expect(restored).toEqual({ count: 6, untilFreeze: 0 });
    // And it covers the next miss.
    expect(streak(SLOTS, [...afterMiss, DAYS[6], DAYS[8]], DAYS[8])).toEqual({
      count: 7,
      untilFreeze: 4,
    });
  });

  it("follows the schedule, not the calendar", () => {
    // Tuesday and Thursday sessions are off the plan; a make-up the day after a miss is not on time.
    expect(streak(SLOTS, ["2026-10-06", "2026-10-08"], DAYS[2]).count).toBe(0);
    expect(streak(SLOTS, [DAYS[0], "2026-10-08", DAYS[2], DAYS[3]], DAYS[3])).toEqual({
      count: 3,
      untilFreeze: 3,
    });
  });

  it("counts a day marked missed that was then done on its day", () => {
    const marked: ScheduleSlot[] = [{ day: DAYS[0], status: "missed" }];
    expect(streak(marked, days(0), DAYS[0])).toEqual({ count: 1, untilFreeze: 0 });
  });

  it("keeps the freeze when a miss has no streak to protect", () => {
    expect(streak(SLOTS, days(1, 2), DAYS[2])).toEqual({ count: 2, untilFreeze: 0 });
  });

  it("ignores schedule days after today", () => {
    expect(streak(SLOTS, days(0), DAYS[0]).count).toBe(1);
  });

  it("reads as a label", () => {
    expect(streakLabel(0)).toBe("No streak yet");
    expect(streakLabel(1)).toBe("1-session streak");
    expect(freezeLabel({ count: 2, untilFreeze: 0 })).toBe("Streak freeze banked");
    expect(freezeLabel({ count: 2, untilFreeze: 1 })).toBe(
      "Streak freeze used, back after 1 more on-time session",
    );
  });
});

const TWO_CONCEPTS: UnitOutline[] = [
  {
    number: 1,
    concepts: [
      { key: "a", title: "One-step equations" },
      { key: "b", title: "Two-step equations" },
    ],
  },
];

function keys(badges: readonly { key: string }[]): string[] {
  return badges.map((badge) => badge.key);
}

describe("badges", () => {
  const none = { mastered: new Set<string>(), streak: 0, perfectExplanation: false };

  it("earns nothing before anything is done", () => {
    expect(earnedBadges(ALGEBRA1_CONTENT, none)).toEqual([]);
  });

  it("with one concept shipped, mastering it earns the concept and the unit together", () => {
    const earned = earnedBadges(ALGEBRA1_CONTENT, { ...none, mastered: new Set([S1_KEY]) });
    expect(earned.map((badge) => badge.label)).toEqual([
      "Two-step equations mastered",
      "Unit 1 Mastered",
    ]);
    // The unit badge says how much of the unit there is, nothing more.
    expect(earned[1].detail).toBe("Every concept Unit 1 has so far: 1 of 1.");
  });

  it("waits for every concept in a unit before the unit badge", () => {
    expect(keys(earnedBadges(TWO_CONCEPTS, { ...none, mastered: new Set(["b"]) }))).toEqual([
      "concept:b",
    ]);
    expect(keys(earnedBadges(TWO_CONCEPTS, { ...none, mastered: new Set(["a", "b"]) }))).toEqual([
      "concept:a",
      "concept:b",
      "unit:1",
    ]);
  });

  it("earns the streak badge at five and the explanation badge on 3 of 3", () => {
    expect(earnedBadges(ALGEBRA1_CONTENT, { ...none, streak: 4 })).toEqual([]);
    expect(keys(earnedBadges(ALGEBRA1_CONTENT, { ...none, streak: 5 }))).toEqual(["streak-5"]);
    expect(keys(earnedBadges(ALGEBRA1_CONTENT, { ...none, perfectExplanation: true }))).toEqual([
      "explained-perfectly",
    ]);
  });

  it("lists every badge once on the shelf", () => {
    const shelf = keys(allBadges(TWO_CONCEPTS));
    expect(shelf).toEqual(["concept:a", "concept:b", "unit:1", "streak-5", "explained-perfectly"]);
    expect(new Set(keys(allBadges(ALGEBRA1_CONTENT))).size).toBe(4);
  });
});

describe("levels", () => {
  it("is 1 plus the units mastered", () => {
    expect(level(TWO_CONCEPTS, new Set(["a"]))).toBe(1);
    expect(level(TWO_CONCEPTS, new Set(["a", "b"]))).toBe(2);
    expect(level(ALGEBRA1_CONTENT, new Set([S1_KEY]))).toBe(2);
  });

  it("skips a unit with no concepts yet", () => {
    const stubbed: UnitOutline[] = [...TWO_CONCEPTS, { number: 2, concepts: [] }];
    expect(currentUnit(stubbed, new Set(["a", "b"]))).toEqual({ number: 1, mastered: 2, total: 2 });
    expect(level(stubbed, new Set(["a", "b"]))).toBe(2);
  });

  it("tracks the unit in progress, and the last unit once all are done", () => {
    expect(currentUnit(TWO_CONCEPTS, new Set(["a"]))).toEqual({ number: 1, mastered: 1, total: 2 });
    expect(currentUnit(ALGEBRA1_CONTENT, new Set([S1_KEY]))).toEqual({
      number: 1,
      mastered: 1,
      total: 1,
    });
  });
});
