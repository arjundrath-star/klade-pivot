import { and, eq } from "drizzle-orm";
import { describe, expect, it, vi } from "vitest";
import { confirmLesson, moveBlock, submitAnswer } from "@/app/student/session/[id]/actions";
import { s1 } from "@/content/algebra1/linear-equations/s1";
import { getDb } from "@/db/client";
import { DEMO_STUDENT_ID, nextMay, seedDemo } from "@/db/demo";
import { findTodaySession, getSession, openTodaySession } from "@/db/queries/sessions";
import { loadSession } from "@/session/load";
import { getStudent } from "@/db/queries/students";
import { attempts, students } from "@/db/schema";
import { sessionProblems } from "@/session/problems";
import { answersFor, recordPass } from "../../helpers/answers";
import { answerExit, solve, withTempDatabase } from "../../helpers/database";

// The session these tests drive is the full one every student but the demo one runs; the demo
// student's shortened variant has tests of its own.
vi.mock("@/db/demo", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/db/demo")>()),
  sessionContentKeyFor: (_studentId: string, conceptKey: string) => conceptKey,
}));

// Runs the session flow against a real libSQL file.
withTempDatabase("klade-db-", new Date("2026-09-29T12:00:00Z"));

async function lessonReadAt(sessionId: string) {
  return (await getSession(sessionId, DEMO_STUDENT_ID))?.lessonReadAt;
}

describe("seed", () => {
  it("seeds Maya once, however many times it runs", async () => {
    await seedDemo(new Date("2026-09-29T12:00:00Z"));
    const db = await getDb();
    const rows = await db.select().from(students).where(eq(students.id, DEMO_STUDENT_ID));
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      name: "Maya",
      grade: 6,
      targetDate: "2027-05-31",
      pacePerWeek: 4,
      timerMode: "standard",
      interests: ["sports", "music"],
    });
    expect(await getStudent(DEMO_STUDENT_ID)).toMatchObject({ id: DEMO_STUDENT_ID, name: "Maya" });
  });

  it("targets the next May that has not started", () => {
    expect(nextMay(new Date(2026, 8, 29))).toBe("2027-05-31");
    expect(nextMay(new Date(2027, 1, 1))).toBe("2027-05-31");
    expect(nextMay(new Date(2027, 4, 1))).toBe("2028-05-31");
  });
});

describe("session flow", () => {
  let sessionId: string;

  it("offers session 1, then opens exactly one log for it", async () => {
    expect(await findTodaySession(DEMO_STUDENT_ID)).toMatchObject({
      kind: "next",
      title: "Solving two-step linear equations",
    });
    const opened = await openTodaySession(DEMO_STUDENT_ID, 1234);
    if (opened === null) throw new Error("no session opened");
    sessionId = opened;
    expect(await openTodaySession(DEMO_STUDENT_ID, 99)).toBe(sessionId);
    expect(await findTodaySession(DEMO_STUDENT_ID)).toMatchObject({ kind: "open", sessionId });
    expect(await getSession(sessionId, DEMO_STUDENT_ID)).toMatchObject({
      seed: 1234,
      currentBlock: "warmup",
    });
    // Another student's session is invisible to this one.
    expect(await getSession(sessionId, "another-student")).toBeUndefined();
    expect(await loadSession(sessionId, "another-student")).toBeUndefined();
  });

  it("keeps Next locked until the warm-up is solved", async () => {
    expect(await moveBlock({ sessionId, from: "warmup", direction: "next" })).toEqual({
      ok: false,
      error: "incomplete",
    });
  });

  it("persists a wrong attempt, then a right one, with seed and template key", async () => {
    const [solution] = await answersFor(sessionId, "warmup");
    const base = { sessionId, block: "warmup" as const, index: 0 };
    expect(await submitAnswer({ ...base, answer: String(solution + 1), timeMs: 4200 })).toEqual({
      ok: true,
      verdict: "incorrect",
    });
    expect(await submitAnswer({ ...base, answer: "banana", timeMs: 100 })).toEqual({
      ok: true,
      verdict: "not-a-number",
    });
    expect(await submitAnswer({ ...base, answer: `x = ${solution}`, timeMs: 3100 })).toEqual({
      ok: true,
      verdict: "correct",
    });
    expect(await submitAnswer({ ...base, answer: String(solution), timeMs: 10 })).toEqual({
      ok: false,
      error: "already-solved",
    });

    const db = await getDb();
    const rows = await db.select().from(attempts).where(eq(attempts.sessionLogId, sessionId));
    const problem = sessionProblems(s1, 1234)[0];
    expect(rows.map((r) => [r.correct, r.timeMs, r.answer])).toEqual([
      [false, 4200, String(solution + 1)],
      [true, 3100, `x = ${solution}`],
    ]);
    for (const row of rows) {
      expect(row).toMatchObject({
        studentId: DEMO_STUDENT_ID,
        block: "warmup",
        problemIndex: 0,
        templateKey: problem.template.key,
        seed: problem.seed,
        hintsUsed: 0,
      });
    }
  });

  it("rejects answers for a block the session is not on, and bad input", async () => {
    expect(
      await submitAnswer({ sessionId, block: "guided", index: 0, answer: "1", timeMs: 1 }),
    ).toEqual({ ok: false, error: "wrong-block" });
    expect(
      await submitAnswer({ sessionId, block: "warmup", index: 7, answer: "1", timeMs: 1 }),
    ).toEqual({ ok: false, error: "invalid" });
    expect(
      await submitAnswer({
        sessionId: "not-a-uuid",
        block: "warmup",
        index: 0,
        answer: "1",
        timeMs: 1,
      }),
    ).toEqual({ ok: false, error: "invalid" });
    expect(
      await submitAnswer({ sessionId, block: "warmup", index: 0, answer: "1", timeMs: -5 }),
    ).toEqual({ ok: false, error: "invalid" });
  });

  it("unlocks the lesson only after every warm-up problem is solved", async () => {
    await solve(sessionId, "warmup", [1]);
    expect(await moveBlock({ sessionId, from: "warmup", direction: "next" })).toMatchObject({
      error: "incomplete",
    });
    // The lesson cannot be confirmed from a block the session is not on.
    expect(await confirmLesson({ sessionId })).toEqual({ ok: false, error: "closed" });
    await solve(sessionId, "warmup", [2]);
  });

  it("moves forward and back, and resumes at the stored block", async () => {
    expect(await moveBlock({ sessionId, from: "warmup", direction: "next" })).toEqual({
      ok: true,
      to: "learn",
      elapsedMs: 0,
    });
    expect((await getSession(sessionId, DEMO_STUDENT_ID))?.currentBlock).toBe("learn");
    // A second tab still showing the warm-up is told the session moved on.
    expect(await moveBlock({ sessionId, from: "warmup", direction: "next" })).toEqual({
      ok: false,
      error: "moved",
    });
    expect(await moveBlock({ sessionId, from: "learn", direction: "back" })).toMatchObject({
      to: "warmup",
    });
    expect(await moveBlock({ sessionId, from: "warmup", direction: "next" })).toMatchObject({
      to: "learn",
    });
  });

  it("holds the student in the lesson until the server has their confirmation", async () => {
    expect(await moveBlock({ sessionId, from: "learn", direction: "next" })).toEqual({
      ok: false,
      error: "incomplete",
    });
    expect(await confirmLesson({ sessionId: "not-a-uuid" })).toEqual({
      ok: false,
      error: "invalid",
    });
    expect(await lessonReadAt(sessionId)).toBeNull();

    expect(await confirmLesson({ sessionId })).toEqual({ ok: true });
    const first = await lessonReadAt(sessionId);
    expect(first).toBeInstanceOf(Date);
    expect(await confirmLesson({ sessionId })).toEqual({ ok: true });
    expect(await lessonReadAt(sessionId)).toEqual(first);
    expect((await loadSession(sessionId, DEMO_STUDENT_ID))?.progress.lessonRead).toBe(true);

    // Going back to the warm-up and returning keeps the lesson confirmed.
    expect(await moveBlock({ sessionId, from: "learn", direction: "back" })).toMatchObject({
      to: "warmup",
    });
    expect(await moveBlock({ sessionId, from: "warmup", direction: "next" })).toMatchObject({
      to: "learn",
    });
    expect(await moveBlock({ sessionId, from: "learn", direction: "next" })).toMatchObject({
      to: "guided",
    });
  });

  it("finishes the session after guided practice is solved", async () => {
    expect(await moveBlock({ sessionId, from: "guided", direction: "next" })).toMatchObject({
      ok: false,
      error: "incomplete",
    });
    const [solution] = await answersFor(sessionId, "guided");
    // A tab left open for five hours is recorded as an hour, not rejected.
    expect(
      await submitAnswer({
        sessionId,
        block: "guided",
        index: 0,
        answer: String(solution),
        timeMs: 5 * 60 * 60 * 1000,
      }),
    ).toEqual({ ok: true, verdict: "correct" });
    const db = await getDb();
    const [guided] = await db
      .select({ timeMs: attempts.timeMs })
      .from(attempts)
      .where(and(eq(attempts.sessionLogId, sessionId), eq(attempts.block, "guided")));
    expect(guided.timeMs).toBe(60 * 60 * 1000);
    expect(await moveBlock({ sessionId, from: "guided", direction: "next" })).toMatchObject({
      error: "incomplete",
    });
    await solve(sessionId, "guided", [1, 2, 3, 4]);
    expect(await moveBlock({ sessionId, from: "guided", direction: "next" })).toMatchObject({
      ok: true,
    });
    expect(await moveBlock({ sessionId, from: "explain", direction: "next" })).toMatchObject({
      error: "incomplete",
    });
    await recordPass(sessionId, "Same thing to both sides keeps it balanced.");
    expect(await moveBlock({ sessionId, from: "explain", direction: "next" })).toMatchObject({
      ok: true,
    });
    await answerExit(sessionId, [true, true, true]);
    expect(await moveBlock({ sessionId, from: "exit", direction: "next" })).toMatchObject({
      ok: true,
      to: "done",
      summary: { outcome: "mastered", exitCorrect: 3, exitTotal: 3, explainPassed: true },
    });

    const session = await getSession(sessionId, DEMO_STUDENT_ID);
    expect(session?.status).toBe("done");
    expect(await moveBlock({ sessionId, from: "exit", direction: "back" })).toEqual({
      ok: false,
      error: "closed",
    });
    expect(await findTodaySession(DEMO_STUDENT_ID)).toEqual({ kind: "complete" });
    expect(await openTodaySession(DEMO_STUDENT_ID, 5)).toBeNull();
  });
});
