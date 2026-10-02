import { describe, expect, it } from "vitest";
import { DEMO_LOCK_RULE } from "@/db/demo";
import { openMessage } from "@/phone/messages";
import { lockingDays, nextLockDay } from "@/session/lock";

// Maya's rule: Mon, Tue, Thu and Sun from 5 PM, weekends locking like any other day.
const RULE = { enabled: true, ...DEMO_LOCK_RULE };

describe("lockingDays and nextLockDay", () => {
  it("find the rule's next day after a day off", () => {
    expect(lockingDays(RULE)).toEqual(["mon", "tue", "thu", "sun"]);
    // Friday Oct 2 to Sunday Oct 4; Wednesday Oct 7 to Thursday Oct 8.
    expect(nextLockDay(RULE, "2026-10-02")).toBe("2026-10-04");
    expect(nextLockDay(RULE, "2026-10-07")).toBe("2026-10-08");
  });

  it("skip the weekend when weekends are off, and give up on a rule that never locks", () => {
    const weekdaysOnly = { ...RULE, weekendOff: true };
    expect(lockingDays(weekdaysOnly)).toEqual(["mon", "tue", "thu"]);
    // Friday Oct 2: Sunday is off, so Monday Oct 5.
    expect(nextLockDay(weekdaysOnly, "2026-10-02")).toBe("2026-10-05");
    expect(nextLockDay({ ...RULE, days: ["sat"], weekendOff: true }, "2026-10-02")).toBeNull();
  });
});

describe("openMessage", () => {
  it("names the next session day on a day the rule does not lock", () => {
    expect(openMessage({ reason: "not-session-day", rule: RULE, nextLockDay: "2026-10-04" })).toBe(
      "Everything is open until Sunday, the next session day.",
    );
    expect(openMessage({ reason: "weekend-off", rule: RULE, nextLockDay: "2026-10-05" })).toBe(
      "It's the weekend. Everything is open until Monday.",
    );
  });

  it("leaves the day out when the rule has no next day", () => {
    expect(openMessage({ reason: "weekend-off", rule: RULE, nextLockDay: null })).toBe(
      "It's the weekend. Everything is open.",
    );
    expect(openMessage({ reason: "not-session-day", rule: RULE, nextLockDay: null })).toBe(
      "No session today. Everything is open.",
    );
  });

  it("keeps the other reasons as they were", () => {
    expect(openMessage({ reason: "session-done", rule: RULE, nextLockDay: "2026-10-04" })).toBe(
      "Today's session is done. Everything is open.",
    );
    expect(openMessage({ reason: "before-start", rule: RULE, nextLockDay: "2026-10-04" })).toBe(
      "Apps lock at 5:00 PM until today's session is done.",
    );
    expect(openMessage({ reason: "no-rule", rule: null, nextLockDay: null })).toBe(
      "No phone rule yet.",
    );
  });
});
