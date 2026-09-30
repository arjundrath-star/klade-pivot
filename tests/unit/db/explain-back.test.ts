import { and, eq } from "drizzle-orm";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { confirmLesson, moveBlock, submitExplanation } from "@/app/student/session/[id]/actions";
import { coachConfigured, requestGrade, type CoachUsage } from "@/coach/client";
import { GRADER_CALLS_PER_SESSION, GRADER_MODEL } from "@/coach/grader";
import type { RubricScores } from "@/coach/rubric";
import { getDb } from "@/db/client";
import { DEMO_STUDENT_ID } from "@/db/demo";
import { openTodaySession } from "@/db/queries/sessions";
import { aiUsage, coachTurns, explainBacks, sessionLogs } from "@/db/schema";
import { loadSession } from "@/session/load";
import { solve, withTempDatabase } from "../../helpers/database";

// The model is mocked; the action, the pass rule and the database are real.
vi.mock("@/coach/client", () => ({
  coachConfigured: vi.fn(() => true),
  requestGrade: vi.fn(),
  streamCoachReply: vi.fn(),
}));

withTempDatabase("klade-explain-", new Date("2026-09-30T12:00:00Z"));

const USAGE: CoachUsage = {
  inputTokens: 820,
  outputTokens: 70,
  cacheReadTokens: 0,
  cacheWriteTokens: 0,
};

const FAILING: RubricScores = { correctness: 2, justification: 1, precision: 1 };
const PASSING: RubricScores = { correctness: 3, justification: 2, precision: 2 };

function graderSays(...replies: (RubricScores | string)[]): void {
  for (const reply of replies) {
    const text =
      typeof reply === "string"
        ? reply
        : JSON.stringify({ feedback: "Say why each step keeps the balance.", ...reply });
    vi.mocked(requestGrade).mockResolvedValueOnce({ text, stopReason: "end_turn", usage: USAGE });
  }
}

const EXPLANATION = "I subtracted from both sides to keep it balanced, then divided both sides.";

function explain(sessionId: string, overrides: Record<string, unknown> = {}) {
  return submitExplanation({
    sessionId,
    text: EXPLANATION,
    source: "typed",
    pasted: false,
    durationMs: 30_000,
    ...overrides,
  });
}

async function rowsFor(sessionId: string) {
  const db = await getDb();
  const [explained, usage] = await Promise.all([
    db.select().from(explainBacks).where(eq(explainBacks.sessionLogId, sessionId)),
    db
      .select()
      .from(aiUsage)
      .where(and(eq(aiUsage.sessionLogId, sessionId), eq(aiUsage.kind, "explain_back"))),
  ]);
  return { explained, usage };
}

/** Closes the demo student's open session and opens a new one already on block 4. */
async function sessionAtExplain(openId: string): Promise<string> {
  const db = await getDb();
  const [open] = await db
    .update(sessionLogs)
    .set({ status: "done", completedAt: new Date() })
    .where(eq(sessionLogs.id, openId))
    .returning({ templateId: sessionLogs.sessionTemplateId });
  const now = new Date();
  const [created] = await db
    .insert(sessionLogs)
    .values({
      studentId: DEMO_STUDENT_ID,
      sessionTemplateId: open.templateId,
      status: "in_progress",
      seed: 777,
      currentBlock: "explain",
      startedAt: now,
      blockStartedAt: now,
    })
    .returning({ id: sessionLogs.id });
  return created.id;
}

let sessionId: string;

beforeAll(async () => {
  const opened = await openTodaySession(DEMO_STUDENT_ID, 2468);
  if (opened === null) throw new Error("no session opened");
  sessionId = opened;
});

beforeEach(() => {
  vi.mocked(requestGrade).mockReset();
  vi.mocked(coachConfigured).mockReturnValue(true);
});

describe("before block 4", () => {
  it("rejects malformed input", async () => {
    expect(await explain(sessionId, { text: "   " })).toEqual({ ok: false, error: "invalid" });
    expect(await explain(sessionId, { text: "x".repeat(1501) })).toEqual({
      ok: false,
      error: "invalid",
    });
    expect(await explain(sessionId, { source: "telepathy" })).toEqual({
      ok: false,
      error: "invalid",
    });
    expect(await explain("not-a-session")).toEqual({ ok: false, error: "invalid" });
  });

  it("grades nothing until the session reaches explain-back", async () => {
    expect(await explain(sessionId)).toEqual({ ok: false, error: "wrong-block" });
    expect(requestGrade).not.toHaveBeenCalled();
  });

  it("gets there through warm-up, the lesson and guided practice", async () => {
    await solve(sessionId, "warmup", [0, 1, 2]);
    expect(await moveBlock({ sessionId, from: "warmup", direction: "next" })).toMatchObject({
      ok: true,
    });
    expect(await confirmLesson({ sessionId })).toEqual({ ok: true });
    expect(await moveBlock({ sessionId, from: "learn", direction: "next" })).toMatchObject({
      ok: true,
    });
    await solve(sessionId, "guided", [0, 1, 2, 3, 4]);
    expect(await moveBlock({ sessionId, from: "guided", direction: "next" })).toMatchObject({
      ok: true,
      to: "explain",
    });
  });
});

describe("grading", () => {
  it("reports grading unavailable without an API key and records nothing", async () => {
    vi.mocked(coachConfigured).mockReturnValue(false);
    expect(await explain(sessionId)).toEqual({ ok: false, error: "unavailable" });
    expect(requestGrade).not.toHaveBeenCalled();
    expect(await rowsFor(sessionId)).toEqual({ explained: [], usage: [] });
  });

  it("fails closed on two malformed replies: no pass, no attempt used, both calls logged", async () => {
    graderSays("not json", '{"correctness": 9}');
    expect(await explain(sessionId)).toEqual({ ok: false, error: "unavailable" });
    const { explained, usage } = await rowsFor(sessionId);
    expect(explained).toEqual([]);
    expect(usage).toHaveLength(2);
    expect(await moveBlock({ sessionId, from: "explain", direction: "next" })).toEqual({
      ok: false,
      error: "incomplete",
    });
  });

  it("requires a retry after a failing first attempt", async () => {
    graderSays(FAILING);
    expect(await explain(sessionId)).toEqual({
      ok: true,
      result: {
        attempt: 1,
        scores: FAILING,
        feedback: "Say why each step keeps the balance.",
        verdict: "fail",
      },
      status: "retry",
    });
    expect(await moveBlock({ sessionId, from: "explain", direction: "next" })).toEqual({
      ok: false,
      error: "incomplete",
    });
  });

  it("passes on the retry and unlocks the exit check", async () => {
    graderSays(PASSING);
    const result = await explain(sessionId, {
      text: "Subtract <b>5</b> from both sides\u0007 so it stays balanced, then divide.",
      source: "voice",
      pasted: true,
      durationMs: 2 * 60 * 60 * 1000,
    });
    expect(result).toMatchObject({
      ok: true,
      result: { attempt: 2, verdict: "pass" },
      status: "passed",
    });

    // The explanation reaches the model as data, with the tag characters stripped.
    const [request] = vi.mocked(requestGrade).mock.calls[0];
    expect(JSON.stringify(request.messages)).toContain(
      "<explanation>Subtract  b 5 /b  from both sides  so it stays balanced, then divide.</explanation>",
    );

    const loaded = await loadSession(sessionId, DEMO_STUDENT_ID);
    expect(loaded?.progress.explainBack).toBe("passed");
    expect(await moveBlock({ sessionId, from: "explain", direction: "next" })).toMatchObject({
      ok: true,
      to: "exit",
    });
  });

  it("stores the scores and the integrity signals with each attempt", async () => {
    const { explained, usage } = await rowsFor(sessionId);
    expect(explained.map((row) => [row.attempt, row.verdict])).toEqual([
      [1, "fail"],
      [2, "pass"],
    ]);
    // No coach hints anywhere, so the latest guided problem is the one explained.
    const [first, second] = explained.sort((a, b) => a.attempt - b.attempt);
    expect(first).toMatchObject({
      block: "guided",
      problemIndex: 4,
      text: EXPLANATION,
      source: "typed",
      pasted: false,
      durationMs: 30_000,
      ...FAILING,
    });
    expect(first.charsPerSecond).toBeCloseTo(EXPLANATION.length / 30);
    // The duration is clamped at an hour, as answer times are.
    expect(second).toMatchObject({ source: "voice", pasted: true, durationMs: 60 * 60 * 1000 });
    expect(usage).toHaveLength(4);
    for (const row of usage) {
      expect(row).toMatchObject({
        kind: "explain_back",
        model: GRADER_MODEL,
        inputTokens: 820,
        outputTokens: 70,
        cacheReadTokens: 0,
        cacheWriteTokens: 0,
      });
    }
  });

  it("grades nothing more once the result is final", async () => {
    expect(await moveBlock({ sessionId, from: "exit", direction: "back" })).toMatchObject({
      ok: true,
      to: "explain",
    });
    expect(await explain(sessionId)).toEqual({ ok: false, error: "graded" });
    expect(requestGrade).not.toHaveBeenCalled();
  });
});

describe("a second failing attempt", () => {
  let second: string;

  beforeAll(async () => {
    second = await sessionAtExplain(sessionId);
  });

  it("explains the guided problem that took the most hints", async () => {
    const db = await getDb();
    await db.insert(coachTurns).values({
      sessionLogId: second,
      block: "guided",
      problemIndex: 1,
      level: 1,
      studentText: "I'm stuck.",
      coachText: "What is in the way of x?",
    });
    expect((await loadSession(second, DEMO_STUDENT_ID))?.explain.problem).toMatchObject({
      block: "guided",
      index: 1,
    });
  });

  it("stands, and still moves the student on to the exit check", async () => {
    graderSays(FAILING, { correctness: 0, justification: 3, precision: 3 });
    expect(await explain(second)).toMatchObject({ ok: true, status: "retry" });
    expect(await explain(second)).toMatchObject({
      ok: true,
      result: { attempt: 2, verdict: "fail" },
      status: "failed",
    });
    expect(await explain(second)).toEqual({ ok: false, error: "graded" });
    const { explained } = await rowsFor(second);
    expect(explained.map((row) => row.problemIndex)).toEqual([1, 1]);
    expect(
      await moveBlock({ sessionId: second, from: "explain", direction: "next" }),
    ).toMatchObject({
      ok: true,
      to: "exit",
    });
  });

  it("caps grader calls per session", async () => {
    const third = await sessionAtExplain(second);
    const db = await getDb();
    await db.insert(aiUsage).values(
      Array.from({ length: GRADER_CALLS_PER_SESSION }, () => ({
        kind: "explain_back" as const,
        model: GRADER_MODEL,
        sessionLogId: third,
        ...USAGE,
      })),
    );
    expect(await explain(third)).toEqual({ ok: false, error: "rate-limited" });
    expect(requestGrade).not.toHaveBeenCalled();
  });
});
