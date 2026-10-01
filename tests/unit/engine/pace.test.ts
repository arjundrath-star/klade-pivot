import { describe, expect, it } from "vitest";
import { ALGEBRA1_UNITS } from "@/content/algebra1/units";
import {
  addDays,
  ALGEBRA1_SESSION_ESTIMATE,
  daysBetween,
  formatWeeklyTime,
  isCalendarDay,
  planPace,
  proposedDays,
  scheduleDays,
  weekdayOf,
  type Pace,
} from "@/engine/pace";

// A Thursday. "Next May" from here is May 31, 2027: 243 days, 34 whole weeks.
const START = "2026-10-01";
const NEXT_MAY = "2027-05-31";

function plan(pace: Pace, target = NEXT_MAY, units = ALGEBRA1_UNITS) {
  return planPace({ totalSessions: ALGEBRA1_SESSION_ESTIMATE, units, start: START, target, pace });
}

function okPlan(pace: Pace, target = NEXT_MAY) {
  const result = plan(pace, target);
  if (!result.ok) throw new Error(`expected a plan, got ${result.error}`);
  return result.plan;
}

describe("planPace", () => {
  it("plans next May at On track as 4 sessions and 2 hours a week, Mon, Tue, Thu, Sun (AC 2)", () => {
    expect(okPlan({ preset: "on-track" })).toMatchObject({
      sessionsPerWeek: 4,
      weeklyMinutes: 120,
      weeks: 30,
      finishDate: "2027-04-28",
      requiredPerWeek: 4,
      onTime: true,
    });
    expect(proposedDays(4)).toEqual(["mon", "tue", "thu", "sun"]);
    expect(formatWeeklyTime(120)).toBe("2 hours");
  });

  it("matches the memo's pace table for 120 sessions", () => {
    expect(okPlan({ preset: "standard" })).toMatchObject({ weeks: 40, weeklyMinutes: 90 });
    expect(okPlan({ preset: "intensive" })).toMatchObject({ weeks: 20, weeklyMinutes: 180 });
  });

  it("returns a plan that is too slow for the target with onTime false", () => {
    const standard = okPlan({ preset: "standard" });
    expect(standard).toMatchObject({ onTime: false, requiredPerWeek: 4 });
    expect(standard.finishDate > NEXT_MAY).toBe(true);
  });

  it("takes an explicit number of sessions a week", () => {
    expect(okPlan({ sessionsPerWeek: 5 })).toMatchObject({ sessionsPerWeek: 5, weeks: 24 });
    expect(proposedDays(5)).toEqual(["mon", "tue", "wed", "thu", "fri"]);
  });

  it("says the target is too soon when it needs more than 6 sessions a week", () => {
    // Nine weeks to Dec 3 would need 14 a week; 6 a week takes 20 weeks.
    expect(plan({ preset: "intensive" }, "2026-12-03")).toEqual({
      ok: false,
      error: "target-too-soon",
      earliestTarget: "2027-02-17",
    });
    expect(plan({ preset: "standard" }, START)).toMatchObject({ error: "target-too-soon" });
    expect(plan({ preset: "standard" }, "2026-09-01")).toMatchObject({ error: "target-too-soon" });
  });

  it("is on time when the target is the earliest finish it suggested", () => {
    expect(okPlan({ preset: "intensive" }, "2027-02-17")).toMatchObject({
      onTime: true,
      finishDate: "2027-02-17",
    });
  });

  it("dates each unit at the end of the week its last session falls in", () => {
    const { milestones, finishDate } = okPlan({ preset: "on-track" });
    expect(milestones).toHaveLength(ALGEBRA1_UNITS.length);
    // 14 sessions at 4 a week end in week 4: Oct 1 + 27 days.
    expect(milestones[0]).toEqual({ title: "Linear equations in one variable", date: "2026-10-28" });
    expect(milestones.at(-1)?.date).toBe(finishDate);
    const dates = milestones.map((m) => m.date);
    expect(dates).toEqual([...dates].sort());
  });

  it("refuses a pace outside 1 to 6 a week and a course with no sessions", () => {
    expect(() => plan({ sessionsPerWeek: 7 })).toThrow(RangeError);
    expect(() => plan({ sessionsPerWeek: 0 })).toThrow(RangeError);
    expect(() => plan({ sessionsPerWeek: 2.5 })).toThrow(RangeError);
    expect(() =>
      planPace({ totalSessions: 0, units: [], start: START, target: NEXT_MAY, pace: { preset: "standard" } }),
    ).toThrow(RangeError);
  });
});

describe("the Algebra 1 outline", () => {
  it("adds up to the course estimate", () => {
    const total = ALGEBRA1_UNITS.reduce((sum, unit) => sum + unit.sessions, 0);
    expect(total).toBe(ALGEBRA1_SESSION_ESTIMATE);
  });
});

describe("proposedDays", () => {
  it("proposes the milestone's days for each preset", () => {
    expect(proposedDays(3)).toEqual(["mon", "wed", "fri"]);
    expect(proposedDays(4)).toEqual(["mon", "tue", "thu", "sun"]);
    expect(proposedDays(6)).toEqual(["mon", "tue", "wed", "thu", "fri", "sat"]);
  });

  it("gives one day per session a week and a fresh copy each time", () => {
    for (let n = 1; n <= 6; n++) expect(proposedDays(n)).toHaveLength(n);
    proposedDays(3).push("sun");
    expect(proposedDays(3)).toHaveLength(3);
    expect(() => proposedDays(7)).toThrow(RangeError);
  });
});

describe("calendar days", () => {
  it("reads weekdays and steps across months and years without a time zone", () => {
    expect(weekdayOf(START)).toBe("thu");
    expect(weekdayOf("2026-10-04")).toBe("sun");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2027-03-14", 1)).toBe("2027-03-15");
    expect(daysBetween(START, NEXT_MAY)).toBe(242);
    expect(daysBetween(NEXT_MAY, START)).toBe(-242);
  });

  it("knows a real calendar day", () => {
    expect(isCalendarDay("2027-02-28")).toBe(true);
    expect(isCalendarDay("2027-02-30")).toBe(false);
    expect(isCalendarDay("2027-2-3")).toBe(false);
    expect(isCalendarDay("")).toBe(false);
    expect(() => addDays("2027-02-30", 1)).toThrow(RangeError);
  });

  it("lists the days on the chosen weekdays, both ends included", () => {
    expect(scheduleDays(START, "2026-10-14", ["mon", "tue", "thu", "sun"])).toEqual([
      "2026-10-01",
      "2026-10-04",
      "2026-10-05",
      "2026-10-06",
      "2026-10-08",
      "2026-10-11",
      "2026-10-12",
      "2026-10-13",
    ]);
    expect(scheduleDays("2026-10-02", START, ["thu"])).toEqual([]);
    expect(scheduleDays(START, START, [])).toEqual([]);
  });
});

describe("formatting", () => {
  it("writes weekly time in hours past an hour", () => {
    expect(formatWeeklyTime(90)).toBe("1.5 hours");
    expect(formatWeeklyTime(60)).toBe("1 hour");
    expect(formatWeeklyTime(30)).toBe("30 minutes");
  });
});
