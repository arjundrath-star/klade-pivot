import { eq } from "drizzle-orm";
import { cache } from "react";
import { getDb } from "@/db/client";
import { families, lockRules, sessionLogs, students } from "@/db/schema";
import type { Interest } from "@/engine/types";
import type { LockRuleFields } from "@/session/lock";

/**
 * The student by id, with the parent's name from the family row. Shared across a request, so a
 * page and its shell read the row once.
 */
export const getStudent = cache(async (id: string) => {
  const db = await getDb();
  const [student] = await db
    .select({
      id: students.id,
      familyId: students.familyId,
      parentName: families.parentName,
      name: students.name,
      pronoun: students.pronoun,
      targetDate: students.targetDate,
      pacePerWeek: students.pacePerWeek,
      sessionDays: students.sessionDays,
      sessionTime: students.sessionTime,
      interests: students.interests,
    })
    .from(students)
    .innerJoin(families, eq(families.id, students.familyId))
    .where(eq(students.id, id));
  return student;
});

/** Replaces the student's interest tags. False when there is no such student. */
export async function setInterests(id: string, interests: readonly Interest[]): Promise<boolean> {
  const db = await getDb();
  const updated = await db
    .update(students)
    .set({ interests: [...interests] })
    .where(eq(students.id, id))
    .returning({ id: students.id });
  return updated.length > 0;
}

type NewStudent = typeof students.$inferInsert & { id: string };

/** One day on the new student's schedule: the concept planned for it and the session's seed. */
export interface ScheduledDay {
  /** YYYY-MM-DD */
  day: string;
  sessionTemplateId: string;
  seed: number;
}

/** The schedule rows for a student's planned days, as `session_logs` stores them. */
export function scheduleRows(studentId: string, schedule: readonly ScheduledDay[]) {
  return schedule.map(({ day, sessionTemplateId, seed }) => ({
    studentId,
    sessionTemplateId,
    status: "scheduled" as const,
    seed,
    scheduledFor: day,
  }));
}

/**
 * Writes a new family, its student, the student's first schedule days and the phone rule when the
 * parent set one, in one batch, so a failure leaves none of them behind.
 */
export async function createFamily(
  parentName: string,
  student: NewStudent,
  schedule: readonly ScheduledDay[],
  lockRule: LockRuleFields | null,
): Promise<void> {
  const db = await getDb();
  const rows = scheduleRows(student.id, schedule);
  const rule =
    lockRule && db.insert(lockRules).values({ studentId: student.id, enabled: true, ...lockRule });
  await db.batch([
    db.insert(families).values({ id: student.familyId, parentName }),
    db.insert(students).values(student),
    db.insert(sessionLogs).values(rows),
    ...(rule ? [rule] : []),
  ]);
}
