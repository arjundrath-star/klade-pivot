import { and, asc, desc, eq, isNull, ne, or, sql } from "drizzle-orm";
import type { RewardKey } from "@/content/rewards";
import { getDb } from "@/db/client";
import type { XpGrant } from "@/db/queries/rewards";
import {
  badges,
  mastery,
  rewardUnlocks,
  sessionLogs,
  sessionTemplates,
  students,
  units,
  xpEvents,
} from "@/db/schema";
import type { BlockId } from "@/session/blocks";
import type { SessionOutcome } from "@/session/mastery";
import type { BlockTimes } from "@/session/timer";

interface TodayConcept {
  templateId: string;
  title: string;
  /** The session content key, which names the concept on the course map. */
  contentKey: string;
  /** The concept is a repeat: its last session did not reach mastery. */
  repeat: boolean;
}

export type TodaySession =
  | ({ kind: "open"; sessionId: string } & TodayConcept)
  | ({ kind: "next" } & TodayConcept)
  /** Every playable concept is mastered. */
  | { kind: "complete" };

/**
 * The session the student should do today: the one in progress, else a concept marked Repeat,
 * else the first playable concept in course order not yet mastered. The course map lists every
 * concept, but only a playable one has a session behind it.
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
      .select({
        id: sessionLogs.id,
        templateId: sessionLogs.sessionTemplateId,
        title: sessionTemplates.title,
        contentKey: sessionTemplates.contentKey,
        repeat: isRepeat,
      })
      .from(sessionLogs)
      .innerJoin(sessionTemplates, eq(sessionTemplates.id, sessionLogs.sessionTemplateId))
      .leftJoin(mastery, studentMastery)
      .where(and(eq(sessionLogs.studentId, studentId), eq(sessionLogs.status, "in_progress"))),
    db
      .select({
        templateId: sessionTemplates.id,
        title: sessionTemplates.title,
        contentKey: sessionTemplates.contentKey,
        repeat: isRepeat,
      })
      .from(sessionTemplates)
      .innerJoin(units, eq(units.id, sessionTemplates.unitId))
      .leftJoin(mastery, studentMastery)
      .where(
        and(
          eq(sessionTemplates.playable, true),
          or(isNull(mastery.status), ne(mastery.status, "mastered")),
        ),
      )
      .orderBy(desc(isRepeat), asc(units.position), asc(sessionTemplates.position))
      .limit(1),
  ]);
  if (open) {
    const { id: sessionId, ...concept } = open;
    return { kind: "open", sessionId, ...concept };
  }
  if (next) return { kind: "next", ...next };
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
      completedAt: sessionLogs.completedAt,
      sessionTemplateId: sessionLogs.sessionTemplateId,
      title: sessionTemplates.title,
      contentKey: sessionTemplates.contentKey,
      interests: students.interests,
      timerMode: students.timerMode,
      sessionDays: students.sessionDays,
      familyId: students.familyId,
      studentName: students.name,
    })
    .from(sessionLogs)
    .innerJoin(sessionTemplates, eq(sessionTemplates.id, sessionLogs.sessionTemplateId))
    .innerJoin(students, eq(students.id, sessionLogs.studentId))
    .where(and(eq(sessionLogs.id, id), eq(sessionLogs.studentId, studentId)));
  return session;
}

/**
 * Moves an open session from block `from` to block `to`, saving the time spent in each block, and
 * stores the XP leaving `from` pays in the same batch, so the two land together or not at all. The
 * award is stored even when another tab moved the session first: the block was complete either
 * way, and a session pays each kind once. False when the session is no longer open at `from`.
 * Finishing a session is `finishSession`.
 */
export async function moveSession(
  id: string,
  from: BlockId,
  to: BlockId,
  blockElapsedMs: BlockTimes,
  xp: XpGrant | null,
): Promise<boolean> {
  const db = await getDb();
  const move = db
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
  const [moved] = xp
    ? await db.batch([move, db.insert(xpEvents).values(xp).onConflictDoNothing()])
    : [await move];
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
  /** Exit-check problems the session had. */
  exitTotal: number;
  explainBackId: string;
  blockElapsedMs: BlockTimes;
  completedAt: Date;
  /** The exit-check XP, when the check passed. */
  xp: XpGrant | null;
  /** Keys of every badge the student qualifies for once this session is done. */
  badges: readonly string[];
  /** Completion rewards whose progress this session leaves at the target. */
  unlocks: readonly RewardKey[];
}

/**
 * Closes a session open on the exit check with its verdict, writes the concept's mastery row and
 * stores what the session earned (XP, badges, completion rewards) in one batch. Awards are
 * idempotent, so a second tab finishing at the same moment stores nothing twice. False when the
 * session was not open on the exit check any more.
 */
export async function finishSession(finish: Finish): Promise<boolean> {
  const { sessionLogId, studentId, sessionTemplateId, outcome, explainBackId } = finish;
  const { exitScore, exitTotal, completedAt, xp } = finish;
  const db = await getDb();
  const evidence = {
    status: outcome,
    sessionLogId,
    exitScore,
    exitTotal,
    explainBackId,
    updatedAt: completedAt,
  };
  // The verdict comes from rows that no longer change once the exit check is answered, so a second
  // tab finishing at the same moment writes the same mastery row; only its status update misses.
  const [closed] = await db.batch([
    db
      .update(sessionLogs)
      .set({ status: "done", outcome, completedAt, blockElapsedMs: finish.blockElapsedMs })
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
    ...(xp ? [db.insert(xpEvents).values(xp).onConflictDoNothing()] : []),
    ...finish.badges.map((key) =>
      db
        .insert(badges)
        .values({ studentId, sessionLogId, key, earnedAt: completedAt })
        .onConflictDoNothing(),
    ),
    ...finish.unlocks.map((key) =>
      db
        .insert(rewardUnlocks)
        .values({ studentId, sessionLogId, key, unlockedAt: completedAt })
        .onConflictDoNothing(),
    ),
  ]);
  return closed.length > 0;
}
