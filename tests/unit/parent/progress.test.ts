import { describe, expect, it } from "vitest";
import {
  calendarDay,
  formatDay,
  progressLine,
  sessionsBehind,
  targetMonth,
  type ScheduleSlot,
} from "@/parent/progress";

const TODAY = "2026-10-01";

describe("sessionsBehind", () => {
  it("is zero with no schedule", () => {
    expect(sessionsBehind([], [], TODAY)).toBe(0);
  });

  it("does not count today's session until it is marked missed", () => {
    expect(sessionsBehind([{ day: TODAY, status: "scheduled" }], [], TODAY)).toBe(0);
    expect(sessionsBehind([{ day: TODAY, status: "missed" }], [], TODAY)).toBe(1);
  });

  it("counts every earlier schedule day, marked or not, and no later one", () => {
    const slots: ScheduleSlot[] = [
      { day: "2026-09-28", status: "scheduled" },
      { day: "2026-09-29", status: "missed" },
      { day: "2026-10-04", status: "scheduled" },
    ];
    expect(sessionsBehind(slots, [], TODAY)).toBe(2);
  });

  it("subtracts sessions completed since the schedule started, so a make-up closes the gap", () => {
    const slots: ScheduleSlot[] = [
      { day: "2026-09-28", status: "scheduled" },
      { day: TODAY, status: "missed" },
    ];
    expect(sessionsBehind(slots, ["2026-09-28"], TODAY)).toBe(1);
    expect(sessionsBehind(slots, ["2026-09-28", "2026-09-30"], TODAY)).toBe(0);
  });

  it("does not let sessions from before the schedule started cover a later miss", () => {
    const slots: ScheduleSlot[] = [{ day: TODAY, status: "missed" }];
    expect(sessionsBehind(slots, ["2026-09-28", "2026-09-29", "2026-09-30"], TODAY)).toBe(1);
  });

  it("never goes below zero when the student works ahead", () => {
    const slots: ScheduleSlot[] = [{ day: "2026-09-30", status: "scheduled" }];
    expect(sessionsBehind(slots, ["2026-09-30", TODAY, TODAY], TODAY)).toBe(0);
  });
});

describe("progressLine", () => {
  it("reads on track at zero behind and counts sessions otherwise", () => {
    expect(progressLine(0, "2027-05-31")).toBe("On track for May");
    expect(progressLine(1, "2027-05-31")).toBe("1 session behind");
    expect(progressLine(3, "2027-05-31")).toBe("3 sessions behind");
  });

  it("reads the month from the date string, whatever the time zone", () => {
    expect(targetMonth("2027-05-01")).toBe("May");
    expect(targetMonth("2027-12-31")).toBe("December");
    expect(() => targetMonth("May")).toThrow();
  });
});

describe("calendarDay", () => {
  it("uses the family's day, not the server's UTC day", () => {
    // 01:30 UTC on October 2 is still the evening of October 1 in New York.
    expect(calendarDay(new Date("2026-10-02T01:30:00Z"))).toBe("2026-10-01");
    expect(calendarDay(new Date("2026-10-02T04:30:00Z"))).toBe("2026-10-02");
  });

  it("formats a calendar day without shifting it", () => {
    expect(formatDay("2026-10-01")).toBe("Thu, Oct 1");
  });
});
