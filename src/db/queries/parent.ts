import { and, asc, count, desc, eq, inArray, isNotNull, ne, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { explainBacks, mastery, sessionLogs, sessionTemplates, units } from "@/db/schema";

/**
 * Typed explanations faster than this many characters a second count as implausibly fast (spec
 * §5). A fast adult typist manages about 8.
 */
const IMPLAUSIBLE_TYPING_CPS = 15;

/** The student's sessions and missed schedule days, most recent first. */
export async function sessionHistory(studentId: string, limit = 30) {
  const db = await getDb();
  return db
    .select({
      id: sessionLogs.id,
      title: sessionTemplates.title,
      status: sessionLogs.status,
      outcome: sessionLogs.outcome,
      scheduledFor: sessionLogs.scheduledFor,
      startedAt: sessionLogs.startedAt,
      completedAt: sessionLogs.completedAt,
      blockElapsedMs: sessionLogs.blockElapsedMs,
    })
    .from(sessionLogs)
    .innerJoin(sessionTemplates, eq(sessionTemplates.id, sessionLogs.sessionTemplateId))
    .where(
      and(
        eq(sessionLogs.studentId, studentId),
        inArray(sessionLogs.status, ["in_progress", "done", "missed"]),
      ),
    )
    .orderBy(desc(sessionLogs.createdAt))
    .limit(limit);
}

/** Every concept in course order with the student's status on it, if any. */
export async function masteryGrid(studentId: string) {
  const db = await getDb();
  return db
    .select({
      id: sessionTemplates.id,
      title: sessionTemplates.title,
      contentKey: sessionTemplates.contentKey,
      status: mastery.status,
      exitScore: mastery.exitScore,
    })
    .from(sessionTemplates)
    .innerJoin(units, eq(units.id, sessionTemplates.unitId))
    .leftJoin(
      mastery,
      and(eq(mastery.sessionTemplateId, sessionTemplates.id), eq(mastery.studentId, studentId)),
    )
    .orderBy(asc(units.position), asc(sessionTemplates.position));
}

/**
 * The explain-back behind the student's most recently decided concept: the student's own words,
 * the rubric scores, the feedback they saw and the session it came from.
 */
export async function latestExplanation(studentId: string) {
  const db = await getDb();
  const [explanation] = await db
    .select({
      concept: sessionTemplates.title,
      text: explainBacks.text,
      source: explainBacks.source,
      correctness: explainBacks.correctness,
      justification: explainBacks.justification,
      precision: explainBacks.precision,
      feedback: explainBacks.feedback,
      verdict: explainBacks.verdict,
      sessionLogId: explainBacks.sessionLogId,
    })
    .from(mastery)
    .innerJoin(explainBacks, eq(explainBacks.id, mastery.explainBackId))
    .innerJoin(sessionTemplates, eq(sessionTemplates.id, mastery.sessionTemplateId))
    .where(and(eq(mastery.studentId, studentId), isNotNull(mastery.explainBackId)))
    .orderBy(desc(mastery.updatedAt))
    .limit(1);
  return explanation;
}

/** The integrity signals across every graded explanation (spec §5), in aggregate only. */
export async function explainIntegrity(studentId: string) {
  const db = await getDb();
  const [row] = await db
    .select({
      graded: count(),
      pasted: sql<number>`coalesce(sum(${explainBacks.pasted}), 0)`.mapWith(Number),
      fast: sql<number>`coalesce(sum(${explainBacks.source} = 'typed' and ${explainBacks.charsPerSecond} > ${IMPLAUSIBLE_TYPING_CPS}), 0)`.mapWith(
        Number,
      ),
    })
    .from(explainBacks)
    .innerJoin(sessionLogs, eq(sessionLogs.id, explainBacks.sessionLogId))
    .where(and(eq(sessionLogs.studentId, studentId), ne(explainBacks.source, "override")));
  return row ?? { graded: 0, pasted: 0, fast: 0 };
}
