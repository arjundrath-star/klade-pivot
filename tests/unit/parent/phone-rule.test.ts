import { describe, expect, it } from "vitest";
import { ruleSummary, timeLabel } from "@/parent/phone-rule";
import { familyMoment, phoneClock } from "@/parent/progress";
import type { LockRuleFields } from "@/session/lock";

describe("timeLabel", () => {
  it("writes a 24-hour time the way a parent reads it", () => {
    expect(timeLabel("17:00")).toBe("5:00 PM");
    expect(timeLabel("00:05")).toBe("12:05 AM");
    expect(timeLabel("12:30")).toBe("12:30 PM");
  });
});

describe("ruleSummary", () => {
  const rule: LockRuleFields = {
    days: ["sun", "mon", "thu"],
    startTime: "17:00",
    categories: ["games", "social"],
    weekendOff: false,
  };

  it("says the rule in one sentence, days in week order", () => {
    expect(ruleSummary(rule, "Maya")).toBe(
      "On Mon, Thu, and Sun, social and games lock at 5:00 PM until Maya's session is done.",
    );
  });

  it("says every day and weekends off", () => {
    const daily: LockRuleFields = {
      ...rule,
      days: ["mon", "tue", "wed", "thu", "fri", "sat", "sun"],
      categories: ["video"],
      weekendOff: true,
    };
    expect(ruleSummary(daily, "Leo")).toBe(
      "Every day, video lock at 5:00 PM until Leo's session is done. Weekends stay open.",
    );
  });
});

describe("familyMoment", () => {
  it("finds the moment the family's clock reads a time, on either side of daylight time", () => {
    expect(familyMoment("2026-10-01", "17:05").toISOString()).toBe("2026-10-01T21:05:00.000Z");
    expect(familyMoment("2026-12-01", "17:05").toISOString()).toBe("2026-12-01T22:05:00.000Z");
    // Midnight before the clocks fall back, and noon after they spring forward.
    expect(familyMoment("2026-11-01", "00:00").toISOString()).toBe("2026-11-01T04:00:00.000Z");
    expect(familyMoment("2027-03-14", "12:00").toISOString()).toBe("2027-03-14T16:00:00.000Z");
  });
});

describe("phoneClock", () => {
  it("shows the family's time and date the way a lock screen does", () => {
    expect(phoneClock(new Date("2026-10-01T21:05:00Z"))).toEqual({
      time: "5:05",
      date: "Thursday, October 1",
    });
  });
});
