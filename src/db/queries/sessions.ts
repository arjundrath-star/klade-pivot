import { and, asc, eq, notExists } from "drizzle-orm";
import { getDb } from "@/db/client";
import { sessionLogs, sessionTemplates, students, units } from "@/db/schema";
import type { BlockId } from "@/session/blocks";
import type { BlockTimes } from "@/session/timer";

type TodaySession =
  | { kind: "open"; sessionId: string; title: string }
  | { kind: "next"; templateId: string; title: string }
  | { kind: "complete" };

/** The session the student should do today: the one in progress, else the next one not done. */
export async function findTodaySession(studentId: string): Promise<TodaySession> {
  const db = await getDb();
  const [[open], [next]] = await Promise.all([
    db
      .select({ id: sessionLogs.id, title: sessionTemplates.title })
      .from(sessionLogs)
      .innerJoin(sessionTemplates, eq(sessionTemplates.id, sessionLogs.sessionTemplateId))
      .where(and(eq(sessionLogs.studentId, studentId), eq(sessionLogs.status, "in_progress"))),
    db
      .select({ id: sessionTemplates.id, title: sessionTemplates.title })
      .from(sessionTemplates)
      .innerJoin(units, eq(units.id, sessionTemplates.unitId))
      .where(
        notExists(
          db
            .select({ id: sessionLogs.id })
            .from(sessionLogs)
            .where(
              and(
                eq(sessionLogs.sessionTemplateId, sessionTemplates.id),
                eq(sessionLogs.studentId, studentId),
                eq(sessionLogs.status, "done"),
              ),
            ),
        ),
      )
      .orderBy(asc(units.position), asc(sessionTemplates.position))
      .limit(1),
  ]);
  if (open) return { kind: "open", sessionId: open.id, title: open.title };
  if (next) return { kind: "next", templateId: next.id, title: next.title };
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
  if (created) return created.id;

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
 * Moves an open session from block `from` to `to`, or finishes it, saving the time spent in each
 * block. False when the session is no longer open at `from`, for example because another tab moved
 * it first.
 */
export async function moveSession(
  id: string,
  from: BlockId,
  to: BlockId | "done",
  blockElapsedMs: BlockTimes,
): Promise<boolean> {
  const db = await getDb();
  const now = new Date();
  const moved = await db
    .update(sessionLogs)
    .set(
      to === "done"
        ? { status: "done", completedAt: now, blockElapsedMs }
        : { currentBlock: to, blockStartedAt: now, blockElapsedMs },
    )
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
