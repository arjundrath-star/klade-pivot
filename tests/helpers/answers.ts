import { and, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { DEMO_STUDENT_ID, S1_TEMPLATE_ID } from "@/db/demo";
import { explainBacks, sessionLogs, students } from "@/db/schema";
import { generateInstance } from "@/engine/generate";
import type { RenderedProblem } from "@/engine/render";
import type { ProblemBlockId } from "@/session/blocks";
import { loadSession } from "@/session/load";
import { renderSessionProblem } from "@/session/problems";
import type { TimerMode } from "@/session/timer";

async function blockProblems(sessionId: string, block: ProblemBlockId) {
  const loaded = await loadSession(sessionId, DEMO_STUDENT_ID);
  if (!loaded) throw new Error(`session ${sessionId} not found`);
  return {
    interests: loaded.session.interests,
    problems: loaded.problems.filter((p) => p.block === block),
  };
}

/** The answers to a block's problems, replayed from the seed the server stored for the session. */
export async function answersFor(sessionId: string, block: ProblemBlockId): Promise<number[]> {
  const { problems } = await blockProblems(sessionId, block);
  return problems.map((p) => generateInstance(p.template, p.seed).solution);
}

/** A block's problems as the server renders them for the session's student. */
export async function renderedFor(
  sessionId: string,
  block: ProblemBlockId,
): Promise<RenderedProblem[]> {
  const { interests, problems } = await blockProblems(sessionId, block);
  return problems.map((p) => renderSessionProblem(p, interests));
}

/** Stores a passing first explain-back for the session, as the grader would have. */
export async function recordPass(sessionId: string, text: string): Promise<void> {
  const loaded = await loadSession(sessionId, DEMO_STUDENT_ID);
  if (!loaded) throw new Error(`session ${sessionId} not found`);
  const { problem } = loaded.explain;
  const db = await getDb();
  await db.insert(explainBacks).values({
    sessionLogId: sessionId,
    block: problem.block,
    problemIndex: problem.index,
    attempt: 1,
    text,
    source: "typed",
    correctness: 3,
    justification: 2,
    precision: 2,
    feedback: "You said why each step keeps the equation balanced.",
    verdict: "pass",
    pasted: false,
    durationMs: 20_000,
    charsPerSecond: text.length / 20,
  });
}

export async function setTimerMode(timerMode: TimerMode): Promise<void> {
  const db = await getDb();
  await db.update(students).set({ timerMode }).where(eq(students.id, DEMO_STUDENT_ID));
}

/**
 * Closes the demo student's open session, if any, and opens a new session 1 already on the exit
 * check, with the explain-back graded: passed, or failed on both attempts.
 */
export async function sessionAtExit(explain: "pass" | "fail" = "pass"): Promise<string> {
  const db = await getDb();
  await db
    .update(sessionLogs)
    .set({ status: "done", completedAt: new Date() })
    .where(and(eq(sessionLogs.studentId, DEMO_STUDENT_ID), eq(sessionLogs.status, "in_progress")));
  const now = new Date();
  const [created] = await db
    .insert(sessionLogs)
    .values({
      studentId: DEMO_STUDENT_ID,
      sessionTemplateId: S1_TEMPLATE_ID,
      status: "in_progress",
      seed: 4242,
      currentBlock: "exit",
      startedAt: now,
      blockStartedAt: now,
    })
    .returning({ id: sessionLogs.id });
  await recordPass(created.id, "Same thing to both sides keeps it balanced.");
  if (explain === "fail") {
    const [first] = await db
      .update(explainBacks)
      .set({ verdict: "fail" })
      .where(eq(explainBacks.sessionLogId, created.id))
      .returning();
    await db.insert(explainBacks).values({ ...first, id: undefined, attempt: 2 });
  }
  return created.id;
}
