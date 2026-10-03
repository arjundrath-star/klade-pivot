import { describe, expect, it } from "vitest";
import { s1 } from "@/content/algebra1/linear-equations/s1";
import { s1Demo } from "@/content/algebra1/linear-equations/s1-demo";
import { growByRate, twoStep } from "@/content/algebra1/linear-equations/s1-templates";
import { S1_DEMO_KEY } from "@/content/keys";
import { sessionContent } from "@/content/sessions";
import { problemCounts, renderSessionProblem, sessionProblems } from "@/session/problems";

describe("the demo student's Session 1", () => {
  it("is registered under a key of its own", () => {
    expect(sessionContent(S1_DEMO_KEY)).toBe(s1Demo);
  });

  it("has two warm-up, two guided and three exit-check problems", () => {
    expect(problemCounts(s1Demo)).toEqual({ warmup: 2, guided: 2, exit: 3 });
  });

  it("reuses Session 1's templates, lesson and chapter unchanged", () => {
    expect(s1Demo.warmup).toEqual(s1.warmup.slice(0, 2));
    expect(s1Demo.guided).toEqual([growByRate, twoStep]);
    expect(s1Demo.exit).toBe(s1.exit);
    expect(s1Demo.learn).toBe(s1.learn);
  });

  it("opens guided practice on the soccer juggling problem, then the symbolic two-step", () => {
    const [first, second] = sessionProblems(s1Demo, 20261002).filter((p) => p.block === "guided");
    expect(first.index).toBe(0);
    expect(renderSessionProblem(first, ["sports", "music"]).text).toMatch(
      /^You can juggle a soccer ball \d+ times in a row\./,
    );
    expect(renderSessionProblem(second, ["sports", "music"])).toMatchObject({
      kind: "symbolic",
      text: "Solve for x.",
    });
  });
});
