import { describe, expect, it } from "vitest";
import { exampleFor, similarProblem } from "@/coach/example";
import { s1 } from "@/content/algebra1/linear-equations/s1";
import { generateInstance } from "@/engine/generate";
import { solutionSteps } from "@/engine/solve";
import { findProblem, renderSessionProblem, sessionProblems } from "@/session/problems";

const SEEDS = Array.from({ length: 40 }, (_, i) => 1000 + i * 7919);

describe("similarProblem", () => {
  it("keeps the template and position but draws a different solution", () => {
    for (const seed of SEEDS) {
      for (const problem of sessionProblems(s1, seed).filter((p) => p.block === "guided")) {
        const similar = similarProblem(problem);
        expect(similar.template).toBe(problem.template);
        expect(similar.block).toBe(problem.block);
        expect(similar.index).toBe(problem.index);
        expect(similar.seed).not.toBe(problem.seed);
        const current = generateInstance(problem.template, problem.seed);
        const other = generateInstance(similar.template, similar.seed);
        expect(other.solution).not.toBe(current.solution);
        expect(other.values).not.toEqual(current.values);
        expect(similarProblem(problem)).toEqual(similar);
      }
    }
  });
});

describe("exampleFor", () => {
  it("renders the similar problem in the same interest, with every step to the answer", () => {
    const problem = findProblem(sessionProblems(s1, 1234), "guided", 1);
    if (!problem) throw new Error("S1 has no guided problem 1");
    const interests = ["sports", "music"] as const;
    const example = exampleFor(problem, interests);
    const similar = similarProblem(problem);
    const rendered = renderSessionProblem(similar, interests);
    expect(rendered.kind).toBe("word");
    expect(example.text).toBe(rendered.text);
    const instance = generateInstance(similar.template, similar.seed);
    expect(example.equation).toMatch(/x/);
    const [last] = solutionSteps(instance).slice(-1);
    expect(example.steps.at(-1)).toEqual({
      label: last.description,
      equation: `x = ${instance.solution}`,
    });
    expect(example.text).not.toBe(renderSessionProblem(problem, interests).text);
  });
});
