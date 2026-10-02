import { and, eq, or } from "drizzle-orm";
import { getDb } from "@/db/client";
import { attempts } from "@/db/schema";

type NewAttempt = Omit<typeof attempts.$inferInsert, "id" | "createdAt">;

export async function recordAttempt(attempt: NewAttempt): Promise<void> {
  const db = await getDb();
  await db.insert(attempts).values(attempt);
}

/**
 * The problems in a session that have a correct attempt (`skipped` false) or a demo skip
 * (`skipped` true). A skipped attempt is never correct, so a problem can show up once each way.
 */
export async function settledAttempts(sessionLogId: string) {
  const db = await getDb();
  return db
    .selectDistinct({
      block: attempts.block,
      problemIndex: attempts.problemIndex,
      skipped: attempts.skipped,
    })
    .from(attempts)
    .where(
      and(
        eq(attempts.sessionLogId, sessionLogId),
        or(eq(attempts.correct, true), eq(attempts.skipped, true)),
      ),
    );
}

/**
 * Records the one attempt an exit-check problem takes. False when the problem already has one, for
 * example because another tab answered it first.
 */
export async function recordExitAttempt(attempt: Omit<NewAttempt, "block">): Promise<boolean> {
  const db = await getDb();
  const inserted = await db
    .insert(attempts)
    .values({ ...attempt, block: "exit" })
    .onConflictDoNothing()
    .returning({ id: attempts.id });
  return inserted.length > 0;
}

/** A session's exit-check attempts. */
export async function exitAttemptsFor(sessionLogId: string) {
  const db = await getDb();
  return db
    .select({ correct: attempts.correct, hintsUsed: attempts.hintsUsed })
    .from(attempts)
    .where(and(eq(attempts.sessionLogId, sessionLogId), eq(attempts.block, "exit")));
}
