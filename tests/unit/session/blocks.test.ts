import { describe, expect, it } from "vitest";
import {
  BLOCK_IDS,
  isBlockComplete,
  problemKey,
  step,
  type BlockId,
  type ProblemCounts,
} from "@/session/blocks";

const counts: ProblemCounts = { warmup: 2, guided: 3 };

describe("block order", () => {
  it("runs warm-up, learn, guided practice, explain-back, exit check", () => {
    expect(BLOCK_IDS).toEqual(["warmup", "learn", "guided", "explain", "exit"]);
  });

  it("walks every block in order and finishes after the last", () => {
    const visited: BlockId[] = ["warmup"];
    let result = step("warmup", "next", true);
    while (result.ok && result.to !== "done") {
      visited.push(result.to);
      result = step(result.to, "next", true);
    }
    expect(visited).toEqual(BLOCK_IDS);
    expect(result).toEqual({ ok: true, to: "done" });
  });

  it("goes back one block and never before the first", () => {
    expect(step("guided", "back", false)).toEqual({ ok: true, to: "learn" });
    expect(step("warmup", "back", true)).toEqual({ ok: false, error: "first-block" });
  });
});

describe("gating", () => {
  it("refuses Next until the current block is complete", () => {
    expect(step("warmup", "next", false)).toEqual({ ok: false, error: "incomplete" });
  });

  it("completes an answered block only when every problem is solved", () => {
    const solved = new Set([problemKey("warmup", 0)]);
    expect(isBlockComplete("warmup", counts, solved)).toBe(false);
    solved.add(problemKey("warmup", 1));
    expect(isBlockComplete("warmup", counts, solved)).toBe(true);
    expect(isBlockComplete("guided", counts, solved)).toBe(false);
  });

  it("does not count solved problems from another block", () => {
    const solved = new Set([0, 1, 2].map((i) => problemKey("warmup", i)));
    expect(isBlockComplete("guided", counts, solved)).toBe(false);
  });

  it("never holds the student in a block that takes no answers", () => {
    for (const block of ["learn", "explain", "exit"] as const) {
      expect(isBlockComplete(block, counts, new Set())).toBe(true);
    }
  });
});

describe("resume", () => {
  it("rebuilds the same gate from the stored solved problems", () => {
    // What a reload sees: the solved keys come back from the attempts table.
    const stored = [
      { block: "warmup" as const, problemIndex: 0 },
      { block: "warmup" as const, problemIndex: 1 },
      { block: "guided" as const, problemIndex: 2 },
    ];
    const solved = new Set(stored.map((p) => problemKey(p.block, p.problemIndex)));
    expect(step("warmup", "next", isBlockComplete("warmup", counts, solved)).ok).toBe(true);
    expect(step("guided", "next", isBlockComplete("guided", counts, solved))).toEqual({
      ok: false,
      error: "incomplete",
    });
  });
});
