import { and, eq } from "drizzle-orm";
import type { RubricScores } from "@/coach/rubric";
import { getDb } from "@/db/client";
import { DEMO_STUDENT_ID, S1_TEMPLATE_ID } from "@/db/demo";
import { explainBacks, sessionLogs, students } from "@/db/schema";
import { generateInstance } from "@/engine/generate";
import type { RenderedProblem } from "@/engine/render";
import type { Interest } from "@/engine/types";
import { calendarDay } from "@/parent/progress";
import type { BlockId, ProblemBlockId } from "@/session/blocks";
import { loadSession } from "@/session/load";
import { renderSessionProblem } from "@/session/problems";
import type { TimerMode } from "@/session/timer";

/** The session as its own student loads it, whichever student that is. */
async function sessionOf(sessionId: string) {
  const db = await getDb();
  const [log] = await db
    .select({ studentId: sessionLogs.studentId })
    .from(sessionLogs)
    .where(eq(sessionLogs.id, sessionId));
  return log ? loadSession(sessionId, log.studentId) : undefined;
}

async function blockProblems(sessionId: string, block: ProblemBlockId) {
  const loaded = await sessionOf(sessionId);
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

/**
 * A block's problems as the server renders them for the session's student, or for a student with
 * `interests` when given.
 */
export async function renderedFor(
  sessionId: string,
  block: ProblemBlockId,
  interests?: readonly Interest[],
): Promise<RenderedProblem[]> {
  const loaded = await blockProblems(sessionId, block);
  return loaded.problems.map((p) => renderSessionProblem(p, interests ?? loaded.interests));
}

/** Stores a passing first explain-back for the session with `scores`, as the grader would have. */
export async function recordPass(
  sessionId: string,
  text: string,
  scores: RubricScores = { correctness: 3, justification: 2, precision: 2 },
): Promise<void> {
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
    ...scores,
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

/** Puts today on the demo student's schedule, as onboarding would have, unless it is there. */
export async function scheduleToday(): Promise<void> {
  const db = await getDb();
  await db
    .insert(sessionLogs)
    .values({
      studentId: DEMO_STUDENT_ID,
      sessionTemplateId: S1_TEMPLATE_ID,
      status: "scheduled",
      seed: 1,
      scheduledFor: calendarDay(new Date()),
    })
    .onConflictDoNothing();
}

/** Closes the demo student's open session, if any. */
export async function closeOpenSession(): Promise<void> {
  const db = await getDb();
  await db
    .update(sessionLogs)
    .set({ status: "done", completedAt: new Date() })
    .where(and(eq(sessionLogs.studentId, DEMO_STUDENT_ID), eq(sessionLogs.status, "in_progress")));
}

/**
 * Closes the demo student's open session, if any, and opens a new session 1 already on `block`.
 */
export async function sessionAt(block: BlockId, seed = 4242): Promise<string> {
  await closeOpenSession();
  const db = await getDb();
  const now = new Date();
  const [created] = await db
    .insert(sessionLogs)
    .values({
      studentId: DEMO_STUDENT_ID,
      sessionTemplateId: S1_TEMPLATE_ID,
      status: "in_progress",
      seed,
      currentBlock: block,
      startedAt: now,
      blockStartedAt: now,
    })
    .returning({ id: sessionLogs.id });
  return created.id;
}

/**
 * Closes the demo student's open session, if any, and opens a new session 1 already on the exit
 * check, with the explain-back graded: passed, or failed on both attempts.
 */
export async function sessionAtExit(explain: "pass" | "fail" = "pass"): Promise<string> {
  const sessionId = await sessionAt("exit");
  await recordPass(sessionId, "Same thing to both sides keeps it balanced.");
  if (explain === "fail") {
    const db = await getDb();
    const [first] = await db
      .update(explainBacks)
      .set({ verdict: "fail" })
      .where(eq(explainBacks.sessionLogId, sessionId))
      .returning();
    await db.insert(explainBacks).values({ ...first, id: undefined, attempt: 2 });
  }
  return sessionId;
}
