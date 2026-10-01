import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { mentorAssignments, mentors } from "@/db/schema";

/** The student's mentor and check-in slot, or undefined when the prototype has none for them. */
export async function mentorFor(studentId: string) {
  const db = await getDb();
  const [mentor] = await db
    .select({
      name: mentors.name,
      school: mentors.school,
      classYear: mentors.classYear,
      checkInDay: mentorAssignments.checkInDay,
      checkInTime: mentorAssignments.checkInTime,
      lastSummary: mentorAssignments.lastSummary,
      note: mentorAssignments.note,
    })
    .from(mentorAssignments)
    .innerJoin(mentors, eq(mentors.id, mentorAssignments.mentorId))
    .where(eq(mentorAssignments.studentId, studentId));
  return mentor;
}
