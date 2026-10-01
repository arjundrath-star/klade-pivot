import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { students } from "@/db/schema";
import type { Interest } from "@/engine/types";

export async function getStudent(id: string) {
  const db = await getDb();
  const [student] = await db
    .select({
      id: students.id,
      familyId: students.familyId,
      name: students.name,
      targetDate: students.targetDate,
      pacePerWeek: students.pacePerWeek,
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
