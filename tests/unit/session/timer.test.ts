import { describe, expect, it } from "vitest";
import {
  blockBudgetSeconds,
  exitProblemSeconds,
  formatClock,
  isExitAnswerLate,
  leaveBlock,
  timeInBlock,
} from "@/session/timer";

describe("blockBudgetSeconds", () => {
  it("budgets each block's minutes, half again for extended time, nothing for untimed", () => {
    expect(blockBudgetSeconds("warmup", "standard")).toBe(240);
    expect(blockBudgetSeconds("guided", "extended")).toBe(900);
    expect(blockBudgetSeconds("exit", "untimed")).toBeNull();
  });
});

describe("exit-check timer", () => {
  it("gives 90 seconds a problem, 135 for extended time, no limit for untimed", () => {
    expect(exitProblemSeconds("standard")).toBe(90);
    expect(exitProblemSeconds("extended")).toBe(135);
    expect(exitProblemSeconds("untimed")).toBeNull();
  });

  it("counts an answer late only past the student's limit and the transit allowance", () => {
    expect(isExitAnswerLate(89_000, "standard")).toBe(false);
    expect(isExitAnswerLate(91_500, "standard")).toBe(false);
    expect(isExitAnswerLate(93_000, "standard")).toBe(true);
    expect(isExitAnswerLate(130_000, "extended")).toBe(false);
    expect(isExitAnswerLate(140_000, "extended")).toBe(true);
    expect(isExitAnswerLate(10 * 60 * 60 * 1000, "untimed")).toBe(false);
  });
});

describe("formatClock", () => {
  it("shows minutes and zero-padded seconds, never below zero", () => {
    expect(formatClock(0)).toBe("0:00");
    expect(formatClock(65.9)).toBe("1:05");
    expect(formatClock(600)).toBe("10:00");
    expect(formatClock(-3)).toBe("0:00");
  });
});

describe("block times", () => {
  const enteredAt = new Date("2026-09-29T12:00:00Z");
  const now = new Date("2026-09-29T12:01:30Z");

  it("adds the current visit to earlier visits", () => {
    expect(timeInBlock({ guided: 5000 }, "guided", enteredAt, now)).toBe(95_000);
    expect(timeInBlock({}, "learn", null, now)).toBe(0);
  });

  it("keeps a block's time when the student leaves and comes back", () => {
    const afterFirstVisit = leaveBlock({}, "guided", enteredAt, now);
    expect(afterFirstVisit).toEqual({ guided: 90_000 });
    const backAgain = new Date("2026-09-29T12:05:00Z");
    const later = new Date("2026-09-29T12:05:10Z");
    expect(timeInBlock(afterFirstVisit, "guided", backAgain, later)).toBe(100_000);
  });

  it("never counts a visit that starts in the future", () => {
    expect(timeInBlock({}, "warmup", now, enteredAt)).toBe(0);
  });
});
