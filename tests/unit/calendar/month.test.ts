import { describe, expect, it } from "vitest";
import {
  dayStates,
  monthEnd,
  monthGrid,
  monthLabel,
  monthOf,
  nextSessionDay,
  shiftMonth,
  weekOf,
} from "@/calendar/month";

describe("month arithmetic", () => {
  it("finds the month, its last day and its label", () => {
    expect(monthOf("2026-10-02")).toBe("2026-10");
    expect(monthEnd("2026-10")).toBe("2026-10-31");
    expect(monthEnd("2026-02")).toBe("2026-02-28");
    expect(monthEnd("2028-02")).toBe("2028-02-29");
    expect(monthLabel("2026-10")).toBe("October 2026");
  });

  it("shifts across year ends", () => {
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
    expect(shiftMonth("2026-10", 0)).toBe("2026-10");
  });

  it("lays the month out Monday first with blanks around it", () => {
    // October 2026 starts on a Thursday and ends on a Saturday.
    const cells = monthGrid("2026-10");
    expect(cells).toHaveLength(35);
    expect(cells.slice(0, 7)).toEqual([
      null,
      null,
      null,
      "2026-10-01",
      "2026-10-02",
      "2026-10-03",
      "2026-10-04",
    ]);
    expect(cells.slice(28)).toEqual([
      "2026-10-26",
      "2026-10-27",
      "2026-10-28",
      "2026-10-29",
      "2026-10-30",
      "2026-10-31",
      null,
    ]);
    expect(cells.filter((day) => day !== null)).toHaveLength(31);
  });

  it("finds the Monday-to-Sunday week of a day", () => {
    expect(weekOf("2026-10-02")).toEqual([
      "2026-09-28",
      "2026-09-29",
      "2026-09-30",
      "2026-10-01",
      "2026-10-02",
      "2026-10-03",
      "2026-10-04",
    ]);
    expect(weekOf("2026-10-05")[0]).toBe("2026-10-05");
    expect(weekOf("2026-10-04")[6]).toBe("2026-10-04");
  });
});

describe("day states", () => {
  // The plan as plannedSlots carries it through Sun Oct 11, for a Mon, Tue, Thu, Sun student,
  // with today Fri Oct 2.
  const slots = [
    { day: "2026-09-24", status: "scheduled" },
    { day: "2026-09-27", status: "scheduled" },
    { day: "2026-09-28", status: "scheduled" },
    { day: "2026-09-29", status: "missed" },
    { day: "2026-10-01", status: "scheduled" },
    { day: "2026-10-02", status: "scheduled" },
    { day: "2026-10-04", status: "scheduled" },
    { day: "2026-10-05", status: "scheduled" },
    { day: "2026-10-06", status: "scheduled" },
    { day: "2026-10-08", status: "scheduled" },
    { day: "2026-10-11", status: "scheduled" },
  ] as const;
  // Sessions finished on three plan days and on one day off the plan.
  const completed = ["2026-09-24", "2026-09-28", "2026-10-01", "2026-09-30"];

  it("reads done, missed and owed days from the plan and the sessions", () => {
    const states = dayStates(slots, completed, "2026-10-02", "2026-09-21", "2026-10-11");
    expect(states.get("2026-09-24")).toBe("done");
    // A plan day that passed without a session is missed, marked or not.
    expect(states.get("2026-09-27")).toBe("missed");
    expect(states.get("2026-09-29")).toBe("missed");
    // A make-up session on a day off the plan still shows as done.
    expect(states.get("2026-09-30")).toBe("done");
    // Today is still open, so it reads scheduled.
    expect(states.get("2026-10-02")).toBe("scheduled");
    // Before the plan started, and on weekdays off the plan, nothing.
    expect(states.has("2026-09-21")).toBe(false);
    expect(states.has("2026-10-07")).toBe(false);
    // The days ahead read scheduled.
    expect(states.get("2026-10-04")).toBe("scheduled");
    expect(states.get("2026-10-08")).toBe("scheduled");
  });

  it("reads today as missed once its row says so, and done once a session finishes", () => {
    const todayMissed = [{ day: "2026-10-02", status: "missed" }] as const;
    const range = ["2026-10-02", "2026-10-02", "2026-10-02"] as const;
    expect(dayStates(todayMissed, [], ...range).get("2026-10-02")).toBe("missed");
    expect(dayStates(todayMissed, ["2026-10-02"], ...range).get("2026-10-02")).toBe("done");
  });

  it("keeps to the range it is asked for", () => {
    const states = dayStates(slots, completed, "2026-10-02", "2026-10-01", "2026-10-04");
    expect([...states.keys()].sort()).toEqual(["2026-10-01", "2026-10-02", "2026-10-04"]);
  });

  it("names the next session from today on", () => {
    const states = dayStates(slots, completed, "2026-10-02", "2026-10-02", "2026-10-16");
    expect(nextSessionDay(states, "2026-10-02")).toBe("2026-10-02");
    expect(nextSessionDay(states, "2026-10-03")).toBe("2026-10-04");
    expect(nextSessionDay(new Map([["2026-10-01", "done"]]), "2026-10-02")).toBeUndefined();
  });

  it("gives a student with no plan nothing", () => {
    expect(dayStates([], [], "2026-10-02", "2026-10-01", "2026-10-31").size).toBe(0);
  });
});
