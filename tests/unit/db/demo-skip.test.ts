import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { describe, expect, it } from "vitest";
import {
  confirmLesson,
  moveBlock,
  skipProblem,
  submitAnswer,
} from "@/app/student/session/[id]/actions";
import { startTodaySession } from "@/app/student/actions";
import { getDb } from "@/db/client";
import { DEMO_SESSION_SEED, DEMO_STUDENT_ID, S1_TEMPLATE_ID, sessionSeedFor } from "@/db/demo";
import { sessionHistory } from "@/db/queries/parent";
import { getSession } from "@/db/queries/sessions";
import { createFamily } from "@/db/queries/students";
import { attempts, mastery } from "@/db/schema";
import { GATE_COOKIE } from "@/gate/token";
import { loadSession } from "@/session/load";
import { recordPass, scheduleToday } from "../../helpers/answers";
import { answerExit, redirectOf, solve, withTempDatabase, xpRows } from "../../helpers/database";

// The demo's skip and its fixed seed, against a real libSQL file.
withTempDatabase("klade-demo-skip-", new Date("2026-10-01T12:00:00Z"));

async function signOut() {
  (await cookies()).delete(GATE_COOKIE);
}

async function attemptRows(sessionId: string) {
  const db = await getDb();
  return db
    .select({
      block: attempts.block,
      problemIndex: attempts.problemIndex,
      answer: attempts.answer,
      correct: attempts.correct,
      skipped: attempts.skipped,
    })
    .from(attempts)
    .where(eq(attempts.sessionLogId, sessionId))
    .orderBy(attempts.createdAt);
}

const skip = (sessionId: string, block: "warmup" | "guided", index: number) =>
  skipProblem({ sessionId, block, index, timeMs: 1000 });

describe("the demo session", () => {
  let sessionId: string;

  it("opens for the demo student from the fixed seed", async () => {
    await scheduleToday();
    const path = await redirectOf(startTodaySession);
    sessionId = path.split("/").pop() ?? "";
    expect(path).toBe(`/student/session/${sessionId}`);
    expect((await getSession(sessionId, DEMO_STUDENT_ID))?.seed).toBe(DEMO_SESSION_SEED);
    expect(sessionSeedFor({ studentId: DEMO_STUDENT_ID, visitor: false })).toBe(DEMO_SESSION_SEED);
    expect(sessionSeedFor({ studentId: "a-visitor", visitor: true })).toBe(DEMO_SESSION_SEED);
    // Any other student draws a fresh seed.
    const other = { studentId: "another-student", visitor: false };
    const others = new Set(Array.from({ length: 4 }, () => sessionSeedFor(other)));
    expect(others.has(DEMO_SESSION_SEED)).toBe(false);
    expect(others.size).toBeGreaterThan(1);
  });

  it("refuses a skip from a browser not signed in at the gate, and records nothing", async () => {
    await signOut();
    expect(await skip(sessionId, "warmup", 0)).toEqual({ ok: false, error: "refused" });
    expect(await attemptRows(sessionId)).toEqual([]);
  });

  it("refuses a skip for any student but the one the gate stands for", async () => {
    // A signed-in browser that onboarded a family acts as that student on the student's side.
    const otherStudent = randomUUID();
    await createFamily(
      "Sam",
      {
        id: otherStudent,
        familyId: randomUUID(),
        name: "Ava",
        grade: 7,
        targetDate: "2027-05-31",
        pacePerWeek: 4,
        interests: ["animals"],
      },
      [{ day: "2026-10-03", sessionTemplateId: S1_TEMPLATE_ID, seed: 7 }],
      null,
    );
    (await cookies()).set("klade_student", otherStudent);
    expect(await skip(sessionId, "warmup", 0)).toEqual({ ok: false, error: "refused" });
    expect(await attemptRows(sessionId)).toEqual([]);
  });

  it("has no skip on the exit check", async () => {
    const exit = { sessionId, block: "exit", index: 0, timeMs: 1000 } as unknown as Parameters<
      typeof skipProblem
    >[0];
    expect(await skipProblem(exit)).toEqual({ ok: false, error: "invalid" });
  });

  it("records a signed-in skip as a skipped attempt that settles the problem and nothing else", async () => {
    expect(await skip(sessionId, "warmup", 0)).toEqual({ ok: true });
    expect(await attemptRows(sessionId)).toEqual([
      { block: "warmup", problemIndex: 0, answer: "", correct: false, skipped: true },
    ]);
    // A skipped problem takes no answer and no second skip; the next one is still on the desk.
    expect(await skip(sessionId, "warmup", 0)).toEqual({ ok: false, error: "skipped" });
    expect(
      await submitAnswer({ sessionId, block: "warmup", index: 0, answer: "1", timeMs: 1000 }),
    ).toEqual({ ok: false, error: "skipped" });
    expect(await moveBlock({ sessionId, from: "warmup", direction: "next" })).toMatchObject({
      error: "incomplete",
    });
    const loaded = await loadSession(sessionId, DEMO_STUDENT_ID);
    expect([...(loaded?.progress.skipped ?? [])]).toEqual(["warmup:0"]);
    expect([...(loaded?.progress.solved ?? [])]).toEqual([]);
  });

  it("completes the warm-up with skips and pays it no XP", async () => {
    await solve(sessionId, "warmup", [1]);
    expect(await moveBlock({ sessionId, from: "warmup", direction: "next" })).toMatchObject({
      to: "learn",
    });
    expect(await xpRows(sessionId)).toEqual([]);
  });

  it("opens the lesson's gate on the confirmation alone", async () => {
    expect(await moveBlock({ sessionId, from: "learn", direction: "next" })).toMatchObject({
      error: "incomplete",
    });
    expect(await confirmLesson({ sessionId })).toEqual({ ok: true });
    expect(await moveBlock({ sessionId, from: "learn", direction: "next" })).toMatchObject({
      to: "guided",
    });
  });

  it("pays guided practice for its solved problems only, and never explains a skipped one", async () => {
    expect(await skip(sessionId, "guided", 0)).toEqual({ ok: true });
    await solve(sessionId, "guided", [1]);
    expect(await moveBlock({ sessionId, from: "guided", direction: "next" })).toMatchObject({
      to: "explain",
    });
    expect(await xpRows(sessionId)).toEqual([{ kind: "guided", amount: 5 }]);
    const loaded = await loadSession(sessionId, DEMO_STUDENT_ID);
    expect(loaded?.explain.problem).toMatchObject({ block: "guided", index: 1 });
  });

  it("decides mastery from the exit check and the explain-back as for any session", async () => {
    await recordPass(sessionId, "I undid the plus first, then the times, on both sides.");
    await moveBlock({ sessionId, from: "explain", direction: "next" });
    await answerExit(sessionId, [true, true, true]);
    const result = await moveBlock({ sessionId, from: "exit", direction: "next" });
    expect(result).toMatchObject({ ok: true, to: "done", summary: { outcome: "mastered" } });
    if (!result.ok || result.to !== "done") throw new Error("the session did not finish");
    expect(result.summary.rewards.xp).toBe(5 + 25 + 50);
    const db = await getDb();
    const [row] = await db
      .select({ status: mastery.status, exitScore: mastery.exitScore })
      .from(mastery)
      .where(and(eq(mastery.studentId, DEMO_STUDENT_ID), eq(mastery.sessionLogId, sessionId)));
    expect(row).toEqual({ status: "mastered", exitScore: 3 });
  });

  it("marks the skips in the parent's history", async () => {
    const history = await sessionHistory(DEMO_STUDENT_ID);
    expect(history.find((row) => row.id === sessionId)).toMatchObject({
      outcome: "mastered",
      skipped: 2,
    });
    // A problem a second tab solved while the skip landed counts as solved, not skipped.
    const db = await getDb();
    const [row] = await db
      .select({
        studentId: attempts.studentId,
        sessionLogId: attempts.sessionLogId,
        block: attempts.block,
        problemIndex: attempts.problemIndex,
        templateKey: attempts.templateKey,
        seed: attempts.seed,
      })
      .from(attempts)
      .where(and(eq(attempts.sessionLogId, sessionId), eq(attempts.skipped, true)));
    await db.insert(attempts).values({ ...row, answer: "13", correct: true, timeMs: 1000 });
    const after = await sessionHistory(DEMO_STUDENT_ID);
    expect(after.find((r) => r.id === sessionId)?.skipped).toBe(1);
  });
});
