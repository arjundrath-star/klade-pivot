import { describe, expect, it } from "vitest";
import { demoClockFor, lockState, type LockRule, type UnlockReason } from "@/session/lock";

// Oct 1, 2026 is a Thursday. New York is on daylight time (UTC-4) until Nov 1.
const at = (iso: string) => new Date(iso);
const THU_1705 = at("2026-10-01T21:05:00Z");

const RULE: LockRule = {
  enabled: true,
  days: ["mon", "tue", "thu", "sun"],
  startTime: "17:00",
  categories: ["games", "social"],
  weekendOff: false,
  overrideUntil: null,
};

const MIDNIGHT = at("2026-10-02T04:00:00Z");

describe("lockState", () => {
  it("locks a session day at the start time while the session is not done", () => {
    expect(lockState(RULE, THU_1705, "not-done")).toEqual({ locked: true, reason: "session-due" });
    expect(lockState(RULE, at("2026-10-01T21:00:00Z"), "not-done").locked).toBe(true);
  });

  const unlocked: [string, LockRule | null, Date, "done" | "not-done", UnlockReason][] = [
    ["without a rule", null, THU_1705, "not-done", "no-rule"],
    ["with the rule switched off", { ...RULE, enabled: false }, THU_1705, "not-done", "off"],
    ["on a day the rule skips", RULE, at("2026-10-02T21:05:00Z"), "not-done", "not-session-day"],
    ["a minute before the start", RULE, at("2026-10-01T20:59:00Z"), "not-done", "before-start"],
    ["once the session is done", RULE, THU_1705, "done", "session-done"],
    ["finished before the start", RULE, at("2026-10-01T18:00:00Z"), "done", "before-start"],
    [
      "with tonight's unlock running",
      { ...RULE, overrideUntil: MIDNIGHT },
      THU_1705,
      "not-done",
      "override",
    ],
    [
      "done and unlocked tonight",
      { ...RULE, overrideUntil: MIDNIGHT },
      THU_1705,
      "done",
      "session-done",
    ],
    [
      "on Sunday with weekends off",
      { ...RULE, weekendOff: true },
      at("2026-10-04T21:05:00Z"),
      "not-done",
      "weekend-off",
    ],
    [
      "on Saturday, not a rule day",
      RULE,
      at("2026-10-03T21:05:00Z"),
      "not-done",
      "not-session-day",
    ],
  ];

  it.each(unlocked)("unlocks %s", (_, rule, now, today, reason) => {
    expect(lockState(rule, now, today)).toEqual({ locked: false, reason });
  });

  it("ends tonight's unlock at the real midnight, even while a demo clock is set", () => {
    const tonight = { ...RULE, overrideUntil: MIDNIGHT };
    // The demo clock reads Thursday 5:05 PM; the real time is 11 PM, then 1 AM Friday.
    expect(lockState(tonight, THU_1705, "not-done", at("2026-10-02T03:00:00Z")).locked).toBe(false);
    expect(lockState(tonight, THU_1705, "not-done", at("2026-10-02T05:00:00Z"))).toEqual({
      locked: true,
      reason: "session-due",
    });
  });

  it("locks again once tonight's unlock has run out", () => {
    const spent = { ...RULE, overrideUntil: at("2026-10-01T21:00:00Z") };
    expect(lockState(spent, THU_1705, "not-done").locked).toBe(true);
  });

  it("locks a weekend rule day when weekends are not off", () => {
    expect(lockState(RULE, at("2026-10-04T21:05:00Z"), "not-done").locked).toBe(true);
  });

  it("reads the day and the hour on the family's clock, not the server's", () => {
    // 01:00 UTC on Friday is 9 PM on Thursday in New York.
    expect(lockState(RULE, at("2026-10-02T01:00:00Z"), "not-done").locked).toBe(true);
    // 22:00 UTC on Wednesday is 6 PM Wednesday there, not a rule day.
    expect(lockState(RULE, at("2026-09-30T22:00:00Z"), "not-done")).toEqual({
      locked: false,
      reason: "not-session-day",
    });
  });

  it("locks at a demo clock's moment whatever the real time", () => {
    // The demo clock on Thursday 5:05 PM while the real clock reads Friday morning.
    const demo = demoClockFor(RULE, { sessionDays: [], sessionTime: "17:00" }, "2026-10-02");
    expect(demo).toEqual({ day: "2026-10-01", time: "17:05" });
    expect(lockState(RULE, THU_1705, "not-done").locked).toBe(true);
    expect(lockState(RULE, at("2026-10-02T13:00:00Z"), "not-done").locked).toBe(false);
  });
});

describe("demoClockFor", () => {
  const PLAN = { sessionDays: ["mon", "wed", "fri"] as const, sessionTime: "16:30" };

  it("goes to today when today is a rule day", () => {
    expect(demoClockFor(RULE, PLAN, "2026-10-01")).toEqual({ day: "2026-10-01", time: "17:05" });
  });

  it("uses the plan's days and start time without a rule", () => {
    expect(demoClockFor(null, PLAN, "2026-10-01")).toEqual({ day: "2026-09-30", time: "16:35" });
  });

  it("skips the weekend when weekends are off", () => {
    const rule: LockRule = { ...RULE, days: ["fri", "sat", "sun"], weekendOff: true };
    expect(demoClockFor(rule, PLAN, "2026-10-04")).toEqual({ day: "2026-10-02", time: "17:05" });
  });

  it("stays on today when the rule can lock on no day, and before midnight", () => {
    const rule: LockRule = { ...RULE, days: ["sat"], weekendOff: true, startTime: "23:58" };
    expect(demoClockFor(rule, PLAN, "2026-10-01")).toEqual({ day: "2026-10-01", time: "23:59" });
  });
});
