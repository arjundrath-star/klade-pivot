import { ALGEBRA1_CONTENT } from "@/content/algebra1/concepts";
import { getDb } from "@/db/client";
import { courses, families, sessionTemplates, students, units } from "@/db/schema";
import { DEFAULT_SESSION_TIME, PRESET_SESSIONS, proposedDays } from "@/engine/pace";

/** There is no sign-in yet, so the student pages act as this seeded student. */
export const DEMO_STUDENT_ID = "demo-student-maya";

/** The demo student's family: the parent pages and the admin panel act for it. */
export const DEMO_FAMILY_ID = "demo-family";

/** Session 1 of the seeded curriculum: two-step equations. */
export const S1_TEMPLATE_ID = "algebra-1-linear-equations-s1";

/** May 31 of the next May that has not started yet. */
export function nextMay(now: Date): string {
  const year = now.getMonth() >= 4 ? now.getFullYear() + 1 : now.getFullYear();
  return `${year}-05-31`;
}

/**
 * Seeds the curriculum rows and the demo family: a parent and Maya, grade 6, on track for May. Safe to run again: it
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
    pacePerWeek: PRESET_SESSIONS["on-track"],
    sessionDays: proposedDays(PRESET_SESSIONS["on-track"]),
    sessionTime: DEFAULT_SESSION_TIME,
    pronoun: "she" as const,
    timerMode: "standard" as const,
    interests: ["sports" as const, "music" as const],
  };
  const course = { id: "algebra-1", title: "Algebra 1" };
  const [unit1] = ALGEBRA1_CONTENT;
  const [concept1] = unit1.concepts;
  const unit = {
    id: "algebra-1-linear-equations",
    courseId: course.id,
    title: unit1.title,
    position: unit1.number,
  };
  const session1 = {
    id: S1_TEMPLATE_ID,
    unitId: unit.id,
    title: concept1.title,
    position: 1,
    contentKey: concept1.key,
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
