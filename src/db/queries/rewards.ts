import { and, eq, sum } from "drizzle-orm";
import { getDb } from "@/db/client";
import { badges, mastery, rewardUnlocks, sessionTemplates, xpEvents } from "@/db/schema";
import type { XpAward } from "@/engine/progress";

/** An XP award for one session, as `xp_events` stores it. */
export interface XpGrant extends XpAward {
  studentId: string;
  sessionLogId: string;
}

/**
 * What one session earned: its XP awards, and the badges and completion rewards it was the first
 * to earn.
 */
export async function sessionEarnings(sessionLogId: string) {
  const db = await getDb();
  const [xp, earned, unlocked] = await Promise.all([
    db
      .select({ kind: xpEvents.kind, amount: xpEvents.amount })
      .from(xpEvents)
      .where(eq(xpEvents.sessionLogId, sessionLogId)),
    db.select({ key: badges.key }).from(badges).where(eq(badges.sessionLogId, sessionLogId)),
    db
      .select({ key: rewardUnlocks.key })
      .from(rewardUnlocks)
      .where(eq(rewardUnlocks.sessionLogId, sessionLogId)),
  ]);
  return {
    xp,
    badges: earned.map((row) => row.key),
    unlocks: unlocked.map((row) => row.key),
  };
}

/** Content keys of the concepts the student has mastered. */
export async function masteredConcepts(studentId: string): Promise<Set<string>> {
  const db = await getDb();
  const rows = await db
    .select({ key: sessionTemplates.contentKey })
    .from(mastery)
    .innerJoin(sessionTemplates, eq(sessionTemplates.id, mastery.sessionTemplateId))
    .where(and(eq(mastery.studentId, studentId), eq(mastery.status, "mastered")));
  return new Set(rows.map((row) => row.key));
}

/** The student's XP across every session. */
export async function studentXp(studentId: string): Promise<number> {
  const db = await getDb();
  const [total] = await db
    .select({ xp: sum(xpEvents.amount).mapWith(Number) })
    .from(xpEvents)
    .where(eq(xpEvents.studentId, studentId));
  return total?.xp ?? 0;
}

/** The student's XP across every session, their badges and the concepts they have mastered. */
export async function studentEarnings(studentId: string) {
  const db = await getDb();
  const [xp, earned, mastered] = await Promise.all([
    studentXp(studentId),
    db.select({ key: badges.key }).from(badges).where(eq(badges.studentId, studentId)),
    masteredConcepts(studentId),
  ]);
  return { xp, badges: new Set(earned.map((row) => row.key)), mastered };
}
