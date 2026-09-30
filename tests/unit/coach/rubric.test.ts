import { describe, expect, it } from "vitest";
import { explainStatus, passes, totalScore } from "@/coach/rubric";

describe("pass rule", () => {
  it("passes at 5 of 9 with some correctness", () => {
    expect(passes({ correctness: 1, justification: 2, precision: 2 })).toBe(true);
    expect(passes({ correctness: 3, justification: 1, precision: 1 })).toBe(true);
    expect(passes({ correctness: 3, justification: 3, precision: 3 })).toBe(true);
  });

  it("fails below 5 of 9", () => {
    expect(passes({ correctness: 2, justification: 1, precision: 1 })).toBe(false);
    expect(passes({ correctness: 0, justification: 0, precision: 0 })).toBe(false);
  });

  it("fails any zero on correctness, whatever the total", () => {
    const scores = { correctness: 0, justification: 3, precision: 3 };
    expect(totalScore(scores)).toBe(6);
    expect(passes(scores)).toBe(false);
  });
});

describe("explain-back status", () => {
  it("is pending until something is graded", () => {
    expect(explainStatus([])).toBe("pending");
  });

  it("owes one retry after a failing first attempt", () => {
    expect(explainStatus(["fail"])).toBe("retry");
  });

  it("is final after a pass or after the retry, whichever way the retry goes", () => {
    expect(explainStatus(["pass"])).toBe("passed");
    expect(explainStatus(["fail", "pass"])).toBe("passed");
    expect(explainStatus(["fail", "fail"])).toBe("failed");
  });
});
