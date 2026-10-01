import { describe, expect, it } from "vitest";
import { checkInLabel, lastCheckInDay, nextCheckInDay } from "@/mentor/check-in";

// Thursday check-ins at 7:00 PM in New York (EDT, UTC-4, in October 2026).
describe("the mentor's check-in", () => {
  it("is later today when today is the day and the time has not come", () => {
    expect(nextCheckInDay("thu", "19:00", new Date("2026-10-01T22:59:00Z"))).toBe("2026-10-01");
  });

  it("stays on today's while it runs, and moves a week on once it ends", () => {
    expect(nextCheckInDay("thu", "19:00", new Date("2026-10-01T23:09:00Z"))).toBe("2026-10-01");
    expect(nextCheckInDay("thu", "19:00", new Date("2026-10-01T23:10:00Z"))).toBe("2026-10-08");
  });

  it("reads the family's day, not the server's", () => {
    // 1 AM UTC on Friday is still Thursday evening in New York, after 7 PM.
    expect(nextCheckInDay("thu", "19:00", new Date("2026-10-02T01:00:00Z"))).toBe("2026-10-08");
    expect(nextCheckInDay("fri", "19:00", new Date("2026-10-02T01:00:00Z"))).toBe("2026-10-02");
  });

  it("puts the last check-in a week before the next", () => {
    expect(lastCheckInDay("thu", "19:00", new Date("2026-10-05T12:00:00Z"))).toBe("2026-10-01");
  });

  it("reads as a day and a time", () => {
    expect(checkInLabel("2026-10-08", "19:00")).toBe("Thu, Oct 8, 7:00 PM");
  });
});
