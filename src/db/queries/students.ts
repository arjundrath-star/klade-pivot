import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { families, sessionLogs, students } from "@/db/schema";
import type { Interest } from "@/engine/types";

export async function getStudent(id: string) {
  const db = await getDb();
  const [student] = await db
    .select({
      id: students.id,
      familyId: students.familyId,
      name: students.name,
      pronoun: students.pronoun,
      targetDate: students.targetDate,
      pacePerWeek: students.pacePerWeek,
      sessionDays: students.sessionDays,
      interests: students.interests,
    })
    .from(students)
    .where(eq(students.id, id));
  return student;
}

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

/**
 * Writes a new family, its student and the student's first schedule days in one batch, so a
 * failure leaves none of them behind.
 */
export async function createFamily(
  parentName: string,
  student: NewStudent,
  schedule: readonly ScheduledDay[],
): Promise<void> {
  const db = await getDb();
  const rows = schedule.map(({ day, sessionTemplateId, seed }) => ({
    studentId: student.id,
    sessionTemplateId,
    status: "scheduled" as const,
    seed,
    scheduledFor: day,
  }));
  await db.batch([
    db.insert(families).values({ id: student.familyId, parentName }),
    db.insert(students).values(student),
    db.insert(sessionLogs).values(rows),
  ]);
}
