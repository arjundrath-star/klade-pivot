import { S1_KEY } from "@/content/sessions";
import { getDb } from "@/db/client";
import { courses, families, sessionTemplates, students, units } from "@/db/schema";

/** There is no sign-in yet, so the student pages act as this seeded student. */
export const DEMO_STUDENT_ID = "demo-student-maya";

const DEMO_FAMILY_ID = "demo-family";

/** May 31 of the next May that has not started yet. */
export function nextMay(now: Date): string {
  const year = now.getMonth() >= 4 ? now.getFullYear() + 1 : now.getFullYear();
  return `${year}-05-31`;
}

/**
 * Seeds the curriculum rows and the demo family: a parent and Maya, grade 6. Safe to run again: it
 * restores the demo profile and the curriculum rows and leaves session history alone.
 */
export async function seedDemo(now = new Date()): Promise<void> {
  const db = await getDb();
  const family = { id: DEMO_FAMILY_ID, parentName: "Jordan" };
  const maya = {
    id: DEMO_STUDENT_ID,
    familyId: DEMO_FAMILY_ID,
    name: "Maya",
    grade: 6,
    targetDate: nextMay(now),
    pacePerWeek: 4,
    timerMode: "standard" as const,
    interests: ["sports" as const, "music" as const],
  };
  const course = { id: "algebra-1", title: "Algebra 1" };
  const unit = {
    id: "algebra-1-linear-equations",
    courseId: course.id,
    title: "Linear equations in one variable",
    position: 1,
  };
  const session1 = {
    id: "algebra-1-linear-equations-s1",
    unitId: unit.id,
    title: "Two-step equations",
    position: 1,
    contentKey: S1_KEY,
  };

  await db.batch([
    db.insert(families).values(family).onConflictDoUpdate({ target: families.id, set: family }),
    db.insert(students).values(maya).onConflictDoUpdate({ target: students.id, set: maya }),
    db.insert(courses).values(course).onConflictDoUpdate({ target: courses.id, set: course }),
    db.insert(units).values(unit).onConflictDoUpdate({ target: units.id, set: unit }),
    db
      .insert(sessionTemplates)
      .values(session1)
      .onConflictDoUpdate({ target: sessionTemplates.id, set: session1 }),
  ]);
}
