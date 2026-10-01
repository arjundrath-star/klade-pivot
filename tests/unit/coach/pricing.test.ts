import { describe, expect, it } from "vitest";
import { costCents, MODEL_PRICES } from "@/coach/pricing";
import { COACH_MODEL } from "@/coach/prompt";

const none = { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 };

describe("costCents", () => {
  it("prices the coach's model, which the grader shares", () => {
    expect(MODEL_PRICES[COACH_MODEL]).toEqual({
      input: 1,
      output: 5,
      cacheWrite: 1.25,
      cacheRead: 0.1,
    });
  });

  it("charges each token column at its own rate", () => {
    // A million of each on Haiku: $1 + $5 + $0.10 + $1.25 = $7.35.
    const million = {
      inputTokens: 1_000_000,
      outputTokens: 1_000_000,
      cacheReadTokens: 1_000_000,
      cacheWriteTokens: 1_000_000,
    };
    expect(costCents(COACH_MODEL, million)).toBeCloseTo(735, 9);
  });

  it("puts a typical coach call at a fraction of a cent", () => {
    const call = { ...none, inputTokens: 900, outputTokens: 150 };
    // 900 × $1/M + 150 × $5/M = $0.00165.
    expect(costCents(COACH_MODEL, call)).toBeCloseTo(0.165, 9);
  });

  it("prices the digest model at its own rates", () => {
    expect(costCents("claude-sonnet-5-5", { ...none, outputTokens: 1_000_000 })).toBeCloseTo(
      1000,
      9,
    );
  });

  it("returns null for a model with no price on file, never zero", () => {
    expect(costCents("some-other-model", { ...none, inputTokens: 10 })).toBeNull();
  });
});
