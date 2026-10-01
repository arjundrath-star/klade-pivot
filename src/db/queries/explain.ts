import { and, asc, count, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { aiUsage, explainBacks } from "@/db/schema";

type NewExplainBack = Omit<typeof explainBacks.$inferInsert, "id" | "createdAt">;
type NewAiUsage = Omit<typeof aiUsage.$inferInsert, "id" | "createdAt">;

/** A session's graded explain-backs, first attempt first. */
export async function explainBacksFor(sessionLogId: string) {
  const db = await getDb();
  return db
    .select({
      id: explainBacks.id,
      block: explainBacks.block,
      problemIndex: explainBacks.problemIndex,
      attempt: explainBacks.attempt,
      correctness: explainBacks.correctness,
      justification: explainBacks.justification,
      precision: explainBacks.precision,
      feedback: explainBacks.feedback,
      verdict: explainBacks.verdict,
    })
    .from(explainBacks)
    .where(eq(explainBacks.sessionLogId, sessionLogId))
    .orderBy(asc(explainBacks.attempt));
}

/** Grader calls a session has made, whether or not they produced a verdict. */
export async function graderCalls(sessionLogId: string): Promise<number> {
  const db = await getDb();
  const [row] = await db
    .select({ calls: count() })
    .from(aiUsage)
    .where(and(eq(aiUsage.sessionLogId, sessionLogId), eq(aiUsage.kind, "explain_back")));
  return row?.calls ?? 0;
}

/**
 * Saves a graded explain-back together with the grader calls behind it. False when another tab
 * already recorded this attempt; the calls are logged either way.
 */
export async function recordExplainBack(
  explainBack: NewExplainBack,
  calls: readonly NewAiUsage[],
): Promise<boolean> {
  const db = await getDb();
  const [inserted] = await db.batch([
    db
      .insert(explainBacks)
      .values(explainBack)
      .onConflictDoNothing()
      .returning({ id: explainBacks.id }),
    db.insert(aiUsage).values([...calls]),
  ]);
  return inserted.length > 0;
}

/** Logs grader calls that ended without a verdict. */
export async function recordGraderCalls(calls: readonly NewAiUsage[]): Promise<void> {
  if (calls.length === 0) return;
  const db = await getDb();
  await db.insert(aiUsage).values([...calls]);
}
