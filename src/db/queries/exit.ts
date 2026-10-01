import { and, eq, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { exitShown } from "@/db/schema";

/**
 * Records that exit-check problem `index` is being shown now, unless it was shown before, and
 * returns when it was first shown.
 */
export async function markExitShown(sessionLogId: string, index: number): Promise<Date> {
  const db = await getDb();
  const [row] = await db
    .insert(exitShown)
    .values({ sessionLogId, problemIndex: index, shownAt: new Date() })
    // A no-op update rather than DO NOTHING, so RETURNING gives back the first time on a repeat.
    .onConflictDoUpdate({
      target: [exitShown.sessionLogId, exitShown.problemIndex],
      set: { shownAt: sql`${exitShown.shownAt}` },
    })
    .returning({ shownAt: exitShown.shownAt });
  return row.shownAt;
}

/** When exit-check problem `index` was first shown, or undefined if it never was. */
export async function exitShownAt(sessionLogId: string, index: number): Promise<Date | undefined> {
  const db = await getDb();
  const [row] = await db
    .select({ shownAt: exitShown.shownAt })
    .from(exitShown)
    .where(and(eq(exitShown.sessionLogId, sessionLogId), eq(exitShown.problemIndex, index)));
  return row?.shownAt;
}
