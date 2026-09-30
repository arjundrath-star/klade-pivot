import { asc, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { aiUsage, coachTurns } from "@/db/schema";

type NewCoachTurn = Omit<typeof coachTurns.$inferInsert, "id" | "createdAt">;
type NewAiUsage = Omit<typeof aiUsage.$inferInsert, "id" | "createdAt">;

/** Every coach turn in a session, oldest first. */
export async function coachTurnsFor(sessionLogId: string) {
  const db = await getDb();
  return db
    .select({
      block: coachTurns.block,
      problemIndex: coachTurns.problemIndex,
      level: coachTurns.level,
      studentText: coachTurns.studentText,
      coachText: coachTurns.coachText,
    })
    .from(coachTurns)
    .where(eq(coachTurns.sessionLogId, sessionLogId))
    .orderBy(asc(coachTurns.createdAt), asc(coachTurns.level));
}

/**
 * Saves a finished coach turn together with the model call that produced it. When another tab
 * already recorded this hint level, the call is still logged and the duplicate turn is dropped.
 */
export async function recordCoachTurn(turn: NewCoachTurn, usage: NewAiUsage): Promise<void> {
  const db = await getDb();
  await db.batch([
    db.insert(coachTurns).values(turn).onConflictDoNothing(),
    db.insert(aiUsage).values(usage),
  ]);
}
