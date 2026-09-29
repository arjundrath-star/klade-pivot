import { describe, expect, it } from "vitest";
import {
  BLOCK_IDS,
  isBlockComplete,
  problemKey,
  step,
  type BlockId,
  type ProblemCounts,
  type SessionProgress,
} from "@/session/blocks";

const counts: ProblemCounts = { warmup: 2, guided: 3 };

function progress(solvedKeys: Iterable<string>, lessonRead = false): SessionProgress {
  return { solved: new Set(solvedKeys), lessonRead };
}

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
    const one = progress([problemKey("warmup", 0)]);
    expect(isBlockComplete("warmup", counts, one)).toBe(false);
    const both = progress([problemKey("warmup", 0), problemKey("warmup", 1)]);
    expect(isBlockComplete("warmup", counts, both)).toBe(true);
    expect(isBlockComplete("guided", counts, both)).toBe(false);
  });

  it("does not count solved problems from another block", () => {
    const solved = progress([0, 1, 2].map((i) => problemKey("warmup", i)));
    expect(isBlockComplete("guided", counts, solved)).toBe(false);
  });

  it("holds the student in the lesson until they confirm reading it", () => {
    const everySolved = [
      ...[0, 1].map((i) => problemKey("warmup", i)),
      ...[0, 1, 2].map((i) => problemKey("guided", i)),
    ];
    expect(isBlockComplete("learn", counts, progress(everySolved))).toBe(false);
    expect(isBlockComplete("learn", counts, progress([], true))).toBe(true);
  });

  it("never holds the student in a block that is still a stub", () => {
    for (const block of ["explain", "exit"] as const) {
      expect(isBlockComplete(block, counts, progress([]))).toBe(true);
    }
  });
});

describe("resume", () => {
  it("rebuilds the same gate from the stored solved problems", () => {
    // What a reload sees: the solved keys come back from the attempts table.
    const rows = [
      { block: "warmup" as const, problemIndex: 0 },
      { block: "warmup" as const, problemIndex: 1 },
      { block: "guided" as const, problemIndex: 2 },
    ];
    const resumed = progress(rows.map((p) => problemKey(p.block, p.problemIndex)));
    expect(step("warmup", "next", isBlockComplete("warmup", counts, resumed)).ok).toBe(true);
    expect(step("guided", "next", isBlockComplete("guided", counts, resumed))).toEqual({
      ok: false,
      error: "incomplete",
    });
  });
});
