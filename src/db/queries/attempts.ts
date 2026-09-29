import { and, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { attempts } from "@/db/schema";

type NewAttempt = Omit<typeof attempts.$inferInsert, "id" | "createdAt">;

export async function recordAttempt(attempt: NewAttempt): Promise<void> {
  const db = await getDb();
  await db.insert(attempts).values(attempt);
}

/** The problems in a session that have at least one correct attempt. */
export async function solvedProblems(sessionLogId: string) {
  const db = await getDb();
  return db
    .selectDistinct({ block: attempts.block, problemIndex: attempts.problemIndex })
    .from(attempts)
    .where(and(eq(attempts.sessionLogId, sessionLogId), eq(attempts.correct, true)));
}
