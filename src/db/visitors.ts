import { and, eq, lt } from "drizzle-orm";
import { getDb } from "@/db/client";
import { personaStatements, type DemoHome } from "@/db/demo";
import { familyDeletes } from "@/db/queries/families";
import { getStudent } from "@/db/queries/students";
import { families } from "@/db/schema";

/** How long a visitor's copy lives before the sweep removes it. */
export const VISITOR_TTL_MS = 48 * 60 * 60 * 1000;

/**
 * A visitor's home: a family of its own, marked as a copy, named after the student so that two
 * requests from one browser write the same rows, and every statement is an upsert.
 */
function visitorHome(studentId: string, createdAt?: Date): DemoHome {
  return { familyId: `visitor-${studentId}`, studentId, visitor: true, createdAt };
}

/**
 * Gives `studentId`, the id a browser's cookie carries, a family of its own: a copy of the demo
 * persona's starting state (milestone 20), with the demo clock on so the phone starts locked.
 * Nothing is written when the student already exists. True when a copy was made.
 */
export async function createVisitor(studentId: string, now = new Date()): Promise<boolean> {
  if (await getStudent(studentId)) return false;
  const db = await getDb();
  await db.batch(personaStatements(db, now, visitorHome(studentId)));
  return true;
}

/**
 * Puts a visitor's copy back to its starting state, the family's rows deleted and written again
 * in one transaction, so nothing of any other family is touched and a page that loads meanwhile
 * sees the old copy or the new. The copy keeps the day it was first made, so its 48 hours run
 * from the first visit however often it starts over. Only a visitor's student is reset: false
 * for any other.
 */
export async function resetVisitor(studentId: string, now = new Date()): Promise<boolean> {
  const student = await getStudent(studentId);
  if (!student?.visitor) return false;
  const db = await getDb();
  const [family] = await db
    .select({ createdAt: families.createdAt })
    .from(families)
    .where(eq(families.id, student.familyId));
  await db.batch([
    ...familyDeletes(db, eq(families.id, student.familyId)),
    ...personaStatements(db, now, visitorHome(studentId, family?.createdAt)),
  ]);
  return true;
}

/**
 * Deletes every visitor's copy made more than `VISITOR_TTL_MS` before `now`, with every row it
 * owns, and returns how many families went. The canonical family is never a visitor's, so it is
 * never among them.
 */
export async function deleteStaleVisitors(now = new Date()): Promise<number> {
  const db = await getDb();
  const stale = and(
    eq(families.visitor, true),
    lt(families.createdAt, new Date(now.getTime() - VISITOR_TTL_MS)),
  );
  // `and` of two conditions is never undefined; the type says so only for an empty call.
  if (!stale) return 0;
  const results = await db.batch(familyDeletes(db, stale));
  // The families delete goes last, after every row they owned.
  return results[results.length - 1].rowsAffected;
}
