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
      source: explainBacks.source,
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

interface Override {
  sessionLogId: string;
  block: NewExplainBack["block"];
  problemIndex: number;
  attempt: number;
}

/**
 * Records a passing explain-back that no grader saw, for a live demo the grader cannot stall. It
 * carries no text and zero scores, and its source says it was an override. False when another
 * request already recorded this attempt.
 */
export async function recordOverride(override: Override): Promise<boolean> {
  const db = await getDb();
  const inserted = await db
    .insert(explainBacks)
    .values({
      ...override,
      text: "",
      source: "override",
      correctness: 0,
      justification: 0,
      precision: 0,
      feedback: "",
      verdict: "pass",
      pasted: false,
      durationMs: 0,
      charsPerSecond: 0,
    })
    .onConflictDoNothing()
    .returning({ id: explainBacks.id });
  return inserted.length > 0;
}
