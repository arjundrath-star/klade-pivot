import { beforeEach, describe, expect, it, vi } from "vitest";
import { APIConnectionError } from "@anthropic-ai/sdk";
import { requestGrade, type CoachUsage } from "@/coach/client";
import {
  buildGraderRequest,
  gradeExplanation,
  GRADER_MAX_TOKENS,
  GRADER_MODEL,
  parseGrade,
} from "@/coach/grader";
import { coachContext } from "@/coach/prompt";
import { s1 } from "@/content/algebra1/linear-equations/s1";
import { sessionProblems } from "@/session/problems";

vi.mock("@/coach/client", () => ({ requestGrade: vi.fn() }));

const USAGE: CoachUsage = {
  inputTokens: 700,
  outputTokens: 60,
  cacheReadTokens: 0,
  cacheWriteTokens: 0,
};

const GOOD = JSON.stringify({
  feedback: "Say why subtracting 5 from both sides keeps the equation balanced.",
  correctness: 3,
  justification: 1,
  precision: 2,
});

const problem = sessionProblems(s1, 1234).find((p) => p.block === "guided");
if (!problem) throw new Error("S1 has no guided problem");
const context = coachContext(problem, ["sports"]);

/** Queues replies; a null text stands for a reply cut off at the token cap. */
function modelReplies(...texts: (string | null)[]): void {
  for (const text of texts) {
    vi.mocked(requestGrade).mockResolvedValueOnce(
      text === null
        ? { text: GOOD.slice(0, 40), stopReason: "max_tokens", usage: USAGE }
        : { text, stopReason: "end_turn", usage: USAGE },
    );
  }
}

beforeEach(() => {
  vi.mocked(requestGrade).mockReset();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("parsing", () => {
  it("accepts a well-formed verdict", () => {
    expect(parseGrade(GOOD)).toEqual({
      scores: { correctness: 3, justification: 1, precision: 2 },
      feedback: "Say why subtracting 5 from both sides keeps the equation balanced.",
    });
  });

  it("rejects anything that is not exactly a rubric verdict", () => {
    const verdict = JSON.parse(GOOD) as Record<string, unknown>;
    const bad = [
      "",
      "Correctness 3, justification 1",
      GOOD.slice(0, -10),
      JSON.stringify({ ...verdict, correctness: 4 }),
      JSON.stringify({ ...verdict, precision: -1 }),
      JSON.stringify({ ...verdict, justification: 1.5 }),
      JSON.stringify({ ...verdict, correctness: "3" }),
      JSON.stringify({ ...verdict, feedback: "   " }),
      JSON.stringify({ ...verdict, feedback: "x".repeat(401) }),
      JSON.stringify({ feedback: verdict.feedback, correctness: 3, justification: 1 }),
      JSON.stringify([verdict]),
    ];
    for (const text of bad) expect(parseGrade(text)).toBeUndefined();
  });
});

describe("request", () => {
  it("asks the small model for a schema-shaped verdict with the explanation as data", () => {
    const request = buildGraderRequest(context, "I took 5 away from both sides.");
    expect(request).toMatchObject({ model: GRADER_MODEL, max_tokens: GRADER_MAX_TOKENS });
    expect(GRADER_MODEL).toBe("claude-haiku-4-5-20251001");
    expect(request.system).toEqual([
      expect.objectContaining({ cache_control: { type: "ephemeral" } }),
    ]);
    expect(request.output_config?.format).toMatchObject({
      type: "json_schema",
      schema: {
        required: ["feedback", "correctness", "justification", "precision"],
        additionalProperties: false,
      },
    });
    const text = JSON.stringify(request.messages);
    expect(text).toContain("<explanation>I took 5 away from both sides.</explanation>");
    expect(text).toContain(context.equation);
  });
});

describe("grading", () => {
  it("returns the verdict from a good reply after one call", async () => {
    modelReplies(GOOD);
    const outcome = await gradeExplanation(context, "explanation");
    expect(outcome).toEqual({ ok: true, grade: parseGrade(GOOD), calls: [USAGE] });
  });

  it("retries a malformed reply once", async () => {
    modelReplies("not json", GOOD);
    const outcome = await gradeExplanation(context, "explanation");
    expect(outcome.ok).toBe(true);
    expect(outcome.calls).toHaveLength(2);
  });

  it("fails closed after a second malformed reply, and counts both calls", async () => {
    modelReplies('{"correctness": 3}', null, GOOD);
    expect(await gradeExplanation(context, "explanation")).toEqual({
      ok: false,
      reason: "malformed",
      calls: [USAGE, USAGE],
    });
    expect(requestGrade).toHaveBeenCalledTimes(2);
  });

  it("fails closed when the API cannot be reached", async () => {
    vi.mocked(requestGrade).mockRejectedValueOnce(new APIConnectionError({ message: "down" }));
    expect(await gradeExplanation(context, "explanation")).toEqual({
      ok: false,
      reason: "unreachable",
      calls: [],
    });
  });
});
