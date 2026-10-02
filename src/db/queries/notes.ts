import { and, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { sessionLogs } from "@/db/schema";

/**
 * The notes the student typed in their session; empty when they have typed none or the log is not
 * theirs. Read by the session page alone: the notes are the student's own and reach no other view
 * and no prompt, which is why they are not part of `getSession`'s row.
 */
export async function sessionNotes(id: string, studentId: string): Promise<string> {
  const db = await getDb();
  const [row] = await db
    .select({ notes: sessionLogs.notes })
    .from(sessionLogs)
    .where(and(eq(sessionLogs.id, id), eq(sessionLogs.studentId, studentId)));
  return row?.notes ?? "";
}

/** Stores the student's notes on their open session. False when no such session is open. */
export async function saveSessionNotes(
  id: string,
  studentId: string,
  notes: string,
): Promise<boolean> {
  const db = await getDb();
  const saved = await db
    .update(sessionLogs)
    .set({ notes })
    .where(
      and(
        eq(sessionLogs.id, id),
        eq(sessionLogs.studentId, studentId),
        eq(sessionLogs.status, "in_progress"),
      ),
    )
    .returning({ id: sessionLogs.id });
  return saved.length > 0;
}
