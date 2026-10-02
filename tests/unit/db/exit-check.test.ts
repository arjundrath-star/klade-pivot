import { and, eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { moveBlock, submitExitAnswer } from "@/app/student/session/[id]/actions";
import { getDb } from "@/db/client";
import { S1_KEY } from "@/content/keys";
import { DEMO_STUDENT_ID, S1_TEMPLATE_ID } from "@/db/demo";
import { markExitShown } from "@/db/queries/exit";
import { findTodaySession, getSession, openTodaySession } from "@/db/queries/sessions";
import { attempts, coachTurns, exitShown, mastery, sessionTemplates, students } from "@/db/schema";
import { completeSession } from "@/session/complete";
import { loadSession } from "@/session/load";
import { answersFor, sessionAtExit, setTimerMode } from "../../helpers/answers";
import { answerExit, withTempDatabase } from "../../helpers/database";

// The exit check and the mastery verdict against a real libSQL file.
withTempDatabase("klade-exit-", new Date("2026-10-01T12:00:00Z"));

/** Moves the time exit problem `index` was first shown back by `ms`. */
async function shownAgo(sessionId: string, index: number, ms: number): Promise<void> {
  await markExitShown(sessionId, index);
  const db = await getDb();
  await db
    .update(exitShown)
    .set({ shownAt: new Date(Date.now() - ms) })
    .where(and(eq(exitShown.sessionLogId, sessionId), eq(exitShown.problemIndex, index)));
}

async function exitRows(sessionId: string) {
  const db = await getDb();
  return db
    .select({
      problemIndex: attempts.problemIndex,
      correct: attempts.correct,
      timeMs: attempts.timeMs,
      hintsUsed: attempts.hintsUsed,
    })
    .from(attempts)
    .where(and(eq(attempts.sessionLogId, sessionId), eq(attempts.block, "exit")))
    .orderBy(attempts.problemIndex);
}

async function masteryRow() {
  const db = await getDb();
  const [row] = await db
    .select()
    .from(mastery)
    .where(
      and(eq(mastery.studentId, DEMO_STUDENT_ID), eq(mastery.sessionTemplateId, S1_TEMPLATE_ID)),
    );
  return row;
}

async function answer(sessionId: string, index: number, value: string, expired = false) {
  return submitExitAnswer({ sessionId, index, answer: value, expired });
}

describe("answering the exit check", () => {
  let sessionId: string;
  let solutions: number[];

  it("opens a session and marks its concept in progress", async () => {
    expect(await openTodaySession(DEMO_STUDENT_ID, 99)).not.toBeNull();
    expect(await masteryRow()).toMatchObject({ status: "in_progress", sessionLogId: null });
    sessionId = await sessionAtExit();
    solutions = await answersFor(sessionId, "exit");
    expect(solutions).toHaveLength(3);
  });

  it("refuses an answer to a problem that was never shown", async () => {
    expect(await answer(sessionId, 0, String(solutions[0]))).toEqual({
      ok: false,
      error: "invalid",
    });
  });

  it("takes only the problem on screen", async () => {
    await markExitShown(sessionId, 1);
    expect(await answer(sessionId, 1, String(solutions[1]))).toEqual({
      ok: false,
      error: "invalid",
    });
    expect(await answer(sessionId, 3, "1")).toEqual({ ok: false, error: "invalid" });
  });

  it("keeps the first time a problem was shown", async () => {
    const first = await markExitShown(sessionId, 0);
    const again = await markExitShown(sessionId, 0);
    expect(again.getTime()).toBe(first.getTime());
  });

  it("does not spend the attempt on an answer that is not a number", async () => {
    expect(await answer(sessionId, 0, "five")).toEqual({ ok: true, verdict: "not-a-number" });
    expect(await exitRows(sessionId)).toEqual([]);
  });

  it("records one attempt per problem, then refuses another", async () => {
    expect(await answer(sessionId, 0, String(solutions[0]))).toEqual({
      ok: true,
      verdict: "recorded",
    });
    expect(await answer(sessionId, 0, String(solutions[0] + 1))).toEqual({
      ok: false,
      error: "answered",
    });
    expect(await exitRows(sessionId)).toMatchObject([
      { problemIndex: 0, correct: true, hintsUsed: 0 },
    ]);
  });

  it("refuses to finish with fewer than three attempts and keeps the session open", async () => {
    expect(await moveBlock({ sessionId, from: "exit", direction: "next" })).toEqual({
      ok: false,
      error: "incomplete",
    });
    expect(await completeSession(sessionId, DEMO_STUDENT_ID)).toEqual({
      ok: false,
      error: "incomplete",
    });
    expect((await getSession(sessionId, DEMO_STUDENT_ID))?.status).toBe("in_progress");
  });

  it("has no Back out of the exit check", async () => {
    expect(await moveBlock({ sessionId, from: "exit", direction: "back" })).toEqual({
      ok: false,
      error: "exit-check",
    });
  });

  it("records a right answer that arrives after 90 seconds as incorrect", async () => {
    await shownAgo(sessionId, 1, 95_000);
    expect(await answer(sessionId, 1, String(solutions[1]))).toMatchObject({ ok: true });
    const [, late] = await exitRows(sessionId);
    expect(late.correct).toBe(false);
    expect(late.timeMs).toBeGreaterThanOrEqual(95_000);
  });

  it("records an answer sent because the countdown ran out as incorrect", async () => {
    await markExitShown(sessionId, 2);
    expect(await answer(sessionId, 2, String(solutions[2]), true)).toMatchObject({ ok: true });
    expect((await exitRows(sessionId)).map((row) => row.correct)).toEqual([true, false, false]);
  });

  it("marks the concept Repeat on 1 of 3, and the next session repeats it", async () => {
    const explainId = (await loadSession(sessionId, DEMO_STUDENT_ID))?.explain.latestId;
    expect(await moveBlock({ sessionId, from: "exit", direction: "next" })).toMatchObject({
      ok: true,
      to: "done",
      summary: { outcome: "repeat", exitCorrect: 1, exitTotal: 3, explainPassed: true },
    });
    expect(await getSession(sessionId, DEMO_STUDENT_ID)).toMatchObject({
      status: "done",
      outcome: "repeat",
    });
    expect(await masteryRow()).toMatchObject({
      status: "repeat",
      sessionLogId: sessionId,
      exitScore: 1,
      explainBackId: explainId,
    });
    expect(await completeSession(sessionId, DEMO_STUDENT_ID)).toEqual({
      ok: false,
      error: "closed",
    });

    expect(await findTodaySession(DEMO_STUDENT_ID)).toEqual({
      kind: "next",
      templateId: S1_TEMPLATE_ID,
      title: "Solving two-step linear equations",
      contentKey: S1_KEY,
      repeat: true,
    });
    const reopened = await openTodaySession(DEMO_STUDENT_ID, 7);
    expect(await findTodaySession(DEMO_STUDENT_ID)).toMatchObject({
      kind: "open",
      sessionId: reopened,
      repeat: true,
    });
    // Opening the repeat does not clear the mark; only its own verdict does.
    expect((await masteryRow()).status).toBe("repeat");
  });
});

describe("timer modes", () => {
  it("gives an extended-time student 135 seconds a problem", async () => {
    await setTimerMode("extended");
    const sessionId = await sessionAtExit();
    const solutions = await answersFor(sessionId, "exit");
    await shownAgo(sessionId, 0, 120_000);
    await answer(sessionId, 0, String(solutions[0]));
    await shownAgo(sessionId, 1, 140_000);
    await answer(sessionId, 1, String(solutions[1]));
    expect((await exitRows(sessionId)).map((row) => row.correct)).toEqual([true, false]);
  });

  it("keeps the mastery rule for extended time: 2 of 3 still masters", async () => {
    const sessionId = await sessionAtExit();
    await answerExit(sessionId, [true, false, true]);
    expect(await completeSession(sessionId, DEMO_STUDENT_ID)).toMatchObject({
      ok: true,
      summary: { outcome: "mastered", exitCorrect: 2 },
    });
  });

  it("never runs out an untimed student's clock", async () => {
    await setTimerMode("untimed");
    const sessionId = await sessionAtExit();
    const [solution] = await answersFor(sessionId, "exit");
    await shownAgo(sessionId, 0, 2 * 60 * 60 * 1000);
    await answer(sessionId, 0, String(solution));
    // Correct, with the time clamped at an hour like every other attempt.
    expect(await exitRows(sessionId)).toMatchObject([{ correct: true, timeMs: 60 * 60 * 1000 }]);
    await setTimerMode("standard");
  });
});

describe("completion (D33)", () => {
  it("refuses an exit attempt made with hints and keeps the session open", async () => {
    const sessionId = await sessionAtExit();
    await answerExit(sessionId, [true, true, true]);
    const db = await getDb();
    await db
      .update(attempts)
      .set({ hintsUsed: 1 })
      .where(and(eq(attempts.sessionLogId, sessionId), eq(attempts.problemIndex, 1)));
    expect(await completeSession(sessionId, DEMO_STUDENT_ID)).toEqual({
      ok: false,
      error: "aided",
    });
    expect(await moveBlock({ sessionId, from: "exit", direction: "next" })).toEqual({
      ok: false,
      error: "invalid",
    });
    expect((await getSession(sessionId, DEMO_STUDENT_ID))?.status).toBe("in_progress");
  });

  it("refuses a session with a coach turn on an exit problem", async () => {
    const sessionId = await sessionAtExit();
    await answerExit(sessionId, [true, true, true]);
    const db = await getDb();
    await db.insert(coachTurns).values({
      sessionLogId: sessionId,
      block: "exit",
      problemIndex: 0,
      level: 1,
      studentText: "help",
      coachText: "What undoes adding?",
    });
    expect(await completeSession(sessionId, DEMO_STUDENT_ID)).toEqual({
      ok: false,
      error: "aided",
    });
    expect((await getSession(sessionId, DEMO_STUDENT_ID))?.status).toBe("in_progress");
  });

  it("repeats a perfect exit check when the explain-back failed", async () => {
    const sessionId = await sessionAtExit("fail");
    await answerExit(sessionId, [true, true, true]);
    expect(await completeSession(sessionId, DEMO_STUDENT_ID)).toMatchObject({
      ok: true,
      summary: { outcome: "repeat", exitCorrect: 3, exitTotal: 3, explainPassed: false },
    });
    expect((await masteryRow()).status).toBe("repeat");
  });

  it("masters the concept on 3 of 3 with a passed explain-back, and nothing is left", async () => {
    const sessionId = await sessionAtExit();
    await answerExit(sessionId, [true, true, true]);
    expect(await completeSession(sessionId, DEMO_STUDENT_ID)).toMatchObject({
      ok: true,
      summary: { outcome: "mastered", exitCorrect: 3, exitTotal: 3, explainPassed: true },
    });
    expect(await masteryRow()).toMatchObject({
      status: "mastered",
      sessionLogId: sessionId,
      exitScore: 3,
    });
    expect(await findTodaySession(DEMO_STUDENT_ID)).toEqual({ kind: "complete" });
  });
});

describe("session planner", () => {
  it("puts a concept marked Repeat ahead of the next new one, and skips concepts not built", async () => {
    const db = await getDb();
    const unitId = "algebra-1-linear-equations";
    // Two playable concepts after the course's seven, and one on the map with no session.
    await db.insert(sessionTemplates).values([
      {
        id: "planner-s2",
        unitId,
        title: "Variables on both sides",
        position: 8,
        contentKey: "p2",
        playable: true,
      },
      {
        id: "planner-s3",
        unitId,
        title: "Distributing first",
        position: 9,
        contentKey: "p3",
        playable: true,
      },
    ]);
    expect(await findTodaySession(DEMO_STUDENT_ID)).toEqual({
      kind: "next",
      templateId: "planner-s2",
      title: "Variables on both sides",
      contentKey: "p2",
      repeat: false,
    });

    await db
      .insert(mastery)
      .values({ studentId: DEMO_STUDENT_ID, sessionTemplateId: "planner-s3", status: "repeat" });
    expect(await findTodaySession(DEMO_STUDENT_ID)).toMatchObject({
      kind: "next",
      templateId: "planner-s3",
      repeat: true,
    });
  });

  it("reads only this student's mastery", async () => {
    const db = await getDb();
    await db.insert(students).values({
      id: "planner-leo",
      familyId: "demo-family",
      name: "Leo",
      grade: 7,
      targetDate: "2027-05-31",
      pacePerWeek: 3,
      interests: ["gaming"],
    });
    await db.insert(mastery).values([
      { studentId: "planner-leo", sessionTemplateId: "planner-s2", status: "repeat" },
      { studentId: "planner-leo", sessionTemplateId: S1_TEMPLATE_ID, status: "repeat" },
    ]);
    await db.delete(mastery).where(eq(mastery.sessionTemplateId, "planner-s3"));
    expect(await findTodaySession(DEMO_STUDENT_ID)).toMatchObject({
      kind: "next",
      templateId: "planner-s2",
      repeat: false,
    });
    expect(await findTodaySession("planner-leo")).toMatchObject({
      kind: "next",
      templateId: S1_TEMPLATE_ID,
      repeat: true,
    });
  });
});
