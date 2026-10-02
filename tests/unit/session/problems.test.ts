import { describe, expect, it } from "vitest";
import { s1 } from "@/content/algebra1/linear-equations/s1";
import { S1_KEY } from "@/content/keys";
import { sessionContent } from "@/content/sessions";
import { problemCounts, problemSeed, sessionProblems } from "@/session/problems";

describe("sessionProblems", () => {
  it("lists every problem block in order with its position", () => {
    const problems = sessionProblems(s1, 42);
    expect(problems.map((p) => [p.block, p.index, p.template.key])).toEqual([
      ...s1.warmup.map((t, i) => ["warmup", i, t.key]),
      ...s1.guided.map((t, i) => ["guided", i, t.key]),
      ...s1.exit.map((t, i) => ["exit", i, t.key]),
    ]);
  });

  it("replays the same seeds for the same session seed", () => {
    expect(sessionProblems(s1, 42)).toEqual(sessionProblems(s1, 42));
    expect(sessionProblems(s1, 42).map((p) => p.seed)).not.toEqual(
      sessionProblems(s1, 43).map((p) => p.seed),
    );
  });

  it("keeps a problem's seed when problems are added to another block", () => {
    const longerWarmup = { ...s1, warmup: [...s1.warmup, ...s1.warmup] };
    const guided = (content: typeof s1) =>
      sessionProblems(content, 42).filter((p) => p.block === "guided");
    expect(guided(longerWarmup)).toEqual(guided(s1));
    expect(guided(s1)[0].seed).toBe(problemSeed(42, "guided", 0));
  });

  it("gives each position in a session its own seed", () => {
    const seeds = [0, 1, 2].flatMap((i) =>
      (["warmup", "guided", "exit"] as const).map((block) => problemSeed(42, block, i)),
    );
    expect(new Set(seeds).size).toBe(seeds.length);
  });

  it("counts the problems in each problem block", () => {
    expect(problemCounts(s1)).toEqual({
      warmup: s1.warmup.length,
      guided: s1.guided.length,
      exit: s1.exit.length,
    });
  });
});

describe("session content", () => {
  it("resolves the session 1 key and rejects an unknown one", () => {
    expect(sessionContent(S1_KEY)).toBe(s1);
    expect(() => sessionContent("algebra1/linear-equations/s9")).toThrow(/No session content/);
  });
});
