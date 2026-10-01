import { and, asc, desc, eq, isNull, ne, or, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { mastery, sessionLogs, sessionTemplates, students, units } from "@/db/schema";
import type { BlockId } from "@/session/blocks";
import type { SessionOutcome } from "@/session/mastery";
import type { BlockTimes } from "@/session/timer";

type TodaySession =
  | { kind: "open"; sessionId: string; title: string; repeat: boolean }
  | { kind: "next"; templateId: string; title: string; repeat: boolean }
  | { kind: "complete" };

/**
 * The session the student should do today: the one in progress, else a concept marked Repeat,
 * else the first concept in course order not yet mastered. `repeat` says the concept is a repeat.
 */
export async function findTodaySession(studentId: string): Promise<TodaySession> {
  const db = await getDb();
  const studentMastery = and(
    eq(mastery.sessionTemplateId, sessionTemplates.id),
    eq(mastery.studentId, studentId),
  );
  const isRepeat = sql<boolean>`${mastery.status} is 'repeat'`.mapWith(Boolean);
  const [[open], [next]] = await Promise.all([
    db
      .select({ id: sessionLogs.id, title: sessionTemplates.title, repeat: isRepeat })
      .from(sessionLogs)
      .innerJoin(sessionTemplates, eq(sessionTemplates.id, sessionLogs.sessionTemplateId))
      .leftJoin(mastery, studentMastery)
      .where(and(eq(sessionLogs.studentId, studentId), eq(sessionLogs.status, "in_progress"))),
    db
      .select({ id: sessionTemplates.id, title: sessionTemplates.title, repeat: isRepeat })
      .from(sessionTemplates)
      .innerJoin(units, eq(units.id, sessionTemplates.unitId))
      .leftJoin(mastery, studentMastery)
      .where(or(isNull(mastery.status), ne(mastery.status, "mastered")))
      .orderBy(desc(isRepeat), asc(units.position), asc(sessionTemplates.position))
      .limit(1),
  ]);
  if (open) return { kind: "open", sessionId: open.id, title: open.title, repeat: open.repeat };
  if (next) return { kind: "next", templateId: next.id, title: next.title, repeat: next.repeat };
  return { kind: "complete" };
}

/**
 * Returns the id of the student's open session, starting the next one with `seed` if none is open.
 * Null when every session is done.
 */
export async function openTodaySession(studentId: string, seed: number): Promise<string | null> {
  const today = await findTodaySession(studentId);
  if (today.kind === "open") return today.sessionId;
  if (today.kind === "complete") return null;

  const db = await getDb();
  const now = new Date();
  const [created] = await db
    .insert(sessionLogs)
    .values({
      studentId,
      sessionTemplateId: today.templateId,
      status: "in_progress",
      seed,
      startedAt: now,
      blockStartedAt: now,
    })
    .onConflictDoNothing()
    .returning({ id: sessionLogs.id });
  if (created) {
    // A concept already marked Repeat keeps that mark until this session decides it again.
    await db
      .insert(mastery)
      .values({ studentId, sessionTemplateId: today.templateId, status: "in_progress" })
      .onConflictDoNothing();
    return created.id;
  }

  // A concurrent request opened one first; the one-open-session index kept it to one.
  const raced = await findTodaySession(studentId);
  return raced.kind === "open" ? raced.sessionId : null;
}

/** A session log with what rendering and grading it needs, if it belongs to the student. */
export async function getSession(id: string, studentId: string) {
  const db = await getDb();
  const [session] = await db
    .select({
      id: sessionLogs.id,
      studentId: sessionLogs.studentId,
      status: sessionLogs.status,
      seed: sessionLogs.seed,
      currentBlock: sessionLogs.currentBlock,
      blockStartedAt: sessionLogs.blockStartedAt,
      blockElapsedMs: sessionLogs.blockElapsedMs,
      lessonReadAt: sessionLogs.lessonReadAt,
      outcome: sessionLogs.outcome,
      sessionTemplateId: sessionLogs.sessionTemplateId,
      title: sessionTemplates.title,
      contentKey: sessionTemplates.contentKey,
      interests: students.interests,
      timerMode: students.timerMode,
    })
    .from(sessionLogs)
    .innerJoin(sessionTemplates, eq(sessionTemplates.id, sessionLogs.sessionTemplateId))
    .innerJoin(students, eq(students.id, sessionLogs.studentId))
    .where(and(eq(sessionLogs.id, id), eq(sessionLogs.studentId, studentId)));
  return session;
}

/**
 * Moves an open session from block `from` to block `to`, saving the time spent in each block. False
 * when the session is no longer open at `from`, for example because another tab moved it first.
 * Finishing a session is `finishSession`.
 */
export async function moveSession(
  id: string,
  from: BlockId,
  to: BlockId,
  blockElapsedMs: BlockTimes,
): Promise<boolean> {
  const db = await getDb();
  const moved = await db
    .update(sessionLogs)
    .set({ currentBlock: to, blockStartedAt: new Date(), blockElapsedMs })
    .where(
      and(
        eq(sessionLogs.id, id),
        eq(sessionLogs.status, "in_progress"),
        eq(sessionLogs.currentBlock, from),
      ),
    )
    .returning({ id: sessionLogs.id });
  return moved.length > 0;
}

/**
 * Records that the student read the lesson of their open session on the learn block, keeping the
 * first confirmation's time. False when the student has no session open on the learn block.
 */
export async function markLessonRead(id: string, studentId: string): Promise<boolean> {
  const db = await getDb();
  const marked = await db
    .update(sessionLogs)
    .set({ lessonReadAt: sql`coalesce(${sessionLogs.lessonReadAt}, ${Date.now()})` })
    .where(
      and(
        eq(sessionLogs.id, id),
        eq(sessionLogs.studentId, studentId),
        eq(sessionLogs.status, "in_progress"),
        eq(sessionLogs.currentBlock, "learn"),
      ),
    )
    .returning({ id: sessionLogs.id });
  return marked.length > 0;
}

interface Finish {
  sessionLogId: string;
  studentId: string;
  sessionTemplateId: string;
  outcome: SessionOutcome;
  exitScore: number;
  explainBackId: string;
  blockElapsedMs: BlockTimes;
}

/**
 * Closes a session open on the exit check with its verdict and writes the concept's mastery row, in
 * one batch. False when the session was not open on the exit check any more.
 */
export async function finishSession(finish: Finish): Promise<boolean> {
  const { sessionLogId, studentId, sessionTemplateId, outcome, exitScore, explainBackId } = finish;
  const db = await getDb();
  const now = new Date();
  const evidence = { status: outcome, sessionLogId, exitScore, explainBackId, updatedAt: now };
  // The verdict comes from rows that no longer change once the exit check is answered, so a second
  // tab finishing at the same moment writes the same mastery row; only its status update misses.
  const [closed] = await db.batch([
    db
      .update(sessionLogs)
      .set({ status: "done", outcome, completedAt: now, blockElapsedMs: finish.blockElapsedMs })
      .where(
        and(
          eq(sessionLogs.id, sessionLogId),
          eq(sessionLogs.status, "in_progress"),
          eq(sessionLogs.currentBlock, "exit"),
        ),
      )
      .returning({ id: sessionLogs.id }),
    db
      .insert(mastery)
      .values({ studentId, sessionTemplateId, ...evidence })
      .onConflictDoUpdate({
        target: [mastery.studentId, mastery.sessionTemplateId],
        set: evidence,
      }),
  ]);
  return closed.length > 0;
}
