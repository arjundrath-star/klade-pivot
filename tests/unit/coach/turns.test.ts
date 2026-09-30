import { describe, expect, it } from "vitest";
import {
  COACH_CALLS_PER_SESSION,
  COACH_ERRORS,
  hintLevel,
  isCoachError,
  MAX_HINT_LEVEL,
  openingMessage,
} from "@/coach/turns";

describe("hintLevel", () => {
  it("climbs three hint levels, then hands over to the example", () => {
    expect(hintLevel(0)).toBe(1);
    expect(hintLevel(1)).toBe(2);
    expect(hintLevel(2)).toBe(3);
    expect(hintLevel(3)).toBeNull();
    expect(hintLevel(9)).toBeNull();
    expect(MAX_HINT_LEVEL).toBe(3);
    expect(COACH_CALLS_PER_SESSION).toBe(12);
  });
});

describe("openingMessage", () => {
  it("says what the student tried, or that they are stuck", () => {
    expect(openingMessage("7")).toBe("I tried 7 and it was marked wrong.");
    expect(openingMessage(null)).toBe("I'm stuck.");
  });
});

describe("isCoachError", () => {
  it("accepts the route's codes and nothing else", () => {
    for (const code of COACH_ERRORS) expect(isCoachError(code)).toBe(true);
    expect(isCoachError("teapot")).toBe(false);
    expect(isCoachError(429)).toBe(false);
    expect(isCoachError(null)).toBe(false);
  });
});
