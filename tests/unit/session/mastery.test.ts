import { describe, expect, it } from "vitest";
import type { ExplainStatus } from "@/coach/rubric";
import { EXIT_PASS_MARK, masteryVerdict } from "@/session/mastery";

const STATUSES: readonly ExplainStatus[] = ["pending", "retry", "passed", "failed"];

describe("masteryVerdict", () => {
  it("masters the concept only with 2 of 3 right and the explain-back passed", () => {
    expect(EXIT_PASS_MARK).toBe(2);
    for (const exitCorrect of [0, 1, 2, 3]) {
      for (const status of STATUSES) {
        const expected = exitCorrect >= 2 && status === "passed" ? "mastered" : "repeat";
        expect(masteryVerdict(exitCorrect, status), `${exitCorrect}/3, ${status}`).toBe(expected);
      }
    }
  });

  it("repeats a perfect exit check when the explain-back failed", () => {
    expect(masteryVerdict(3, "failed")).toBe("repeat");
  });

  it("repeats a passed explain-back with 1 of 3 on the exit check", () => {
    expect(masteryVerdict(1, "passed")).toBe("repeat");
  });
});
