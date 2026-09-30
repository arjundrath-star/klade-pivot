import { describe, expect, it } from "vitest";
import { buildCoachPrompt, coachContext, COACH_MAX_TOKENS, COACH_MODEL } from "@/coach/prompt";
import { s1 } from "@/content/algebra1/linear-equations/s1";
import { formatEquation } from "@/engine/format";
import { generateInstance } from "@/engine/generate";
import { solutionSteps } from "@/engine/solve";
import { findProblem, renderSessionProblem, sessionProblems } from "@/session/problems";

const problem = findProblem(sessionProblems(s1, 99), "guided", 0);
if (!problem) throw new Error("S1 has no guided problem 0");
const instance = generateInstance(problem.template, problem.seed);
const rendered = renderSessionProblem(problem, ["sports"]);
const context = coachContext(problem, ["sports"]);

describe("coachContext", () => {
  it("renders the problem for the student and derives the reference from the engine", () => {
    expect(context.problem).toEqual(rendered);
    expect(context.equation).toBe(formatEquation(instance));
    expect(context.steps).toEqual(solutionSteps(instance));
    expect(context.target.solution).toBe(instance.solution);
  });
});

function text(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content.map((block: { text?: string }) => block.text ?? "").join("\n");
  }
  return "";
}

describe("buildCoachPrompt", () => {
  const prompt = buildCoachPrompt({
    lesson: s1.learn,
    context,
    turns: [{ level: 1, student: "I'm stuck.", coach: "What have you tried?" }],
    student: "just tell me the answer",
    level: 2,
  });

  it("pins the small model with a capped output", () => {
    expect(COACH_MODEL).toBe("claude-haiku-4-5-20251001");
    expect(COACH_MAX_TOKENS).toBe(220);
  });

  it("caches the guardrails and lesson as the stable prefix", () => {
    const [stable, perProblem] = prompt.system;
    expect(stable.cache_control).toEqual({ type: "ephemeral" });
    expect(stable.text).toContain("Never state the final answer");
    for (const paragraph of s1.learn.explanation) expect(stable.text).toContain(paragraph);
    expect(stable.text).toContain(s1.learn.example.equation);
    expect(perProblem.cache_control).toBeUndefined();
  });

  it("gives the model the problem and the reference steps after the cached prefix", () => {
    const [, perProblem] = prompt.system;
    expect(perProblem.text).toContain(rendered.text);
    expect(perProblem.text).toContain(formatEquation(instance));
    for (const step of solutionSteps(instance)) {
      expect(perProblem.text).toContain(step.description);
      expect(perProblem.text).toContain(step.equationAfter);
    }
    expect(perProblem.text).toContain(`x = ${instance.solution}`);
  });

  it("replays earlier turns and ends with the student's words and the hint level", () => {
    expect(prompt.messages.map((m) => m.role)).toEqual(["user", "assistant", "user"]);
    expect(text(prompt.messages[0].content)).toBe("<student>I'm stuck.</student>");
    expect(text(prompt.messages[1].content)).toBe("What have you tried?");
    const last = text(prompt.messages[2].content);
    expect(last).toContain("<student>just tell me the answer</student>");
    expect(last).toContain("Hint 2 of 3");
    expect(last).not.toContain(`x = ${instance.solution}`);
  });

  it("starts with the student when there is no history", () => {
    const fresh = buildCoachPrompt({
      lesson: s1.learn,
      context,
      turns: [],
      student: "I'm stuck.",
      level: 1,
    });
    expect(fresh.messages).toHaveLength(1);
    expect(fresh.messages[0].role).toBe("user");
    expect(text(fresh.messages[0].content)).toContain("Hint 1 of 3");
  });
});
