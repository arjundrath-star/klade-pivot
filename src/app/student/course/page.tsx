import type { Metadata } from "next";
import { connection } from "next/server";
import { startTodaySession } from "../actions";
import { StudentShell } from "../student-shell";
import { adminControls } from "@/admin/controls";
import { PageHeader } from "@/components/ui/page-header";
import { ALGEBRA1_COURSE, ALGEBRA1_TITLE } from "@/content/algebra1/course";
import { CourseMap } from "@/course/course-map";
import { masteredConcepts, studentXp } from "@/db/queries/rewards";
import { findTodaySession } from "@/db/queries/sessions";
import { getStudent } from "@/db/queries/students";
import { courseProgress } from "@/engine/course";
import { currentStudentId } from "@/session/current-student";
import { studentStreak } from "@/session/pace";

export const metadata: Metadata = { title: "Course" };

export default async function CoursePage() {
  await connection();
  const studentId = await currentStudentId();
  const [controls, student, today, xp, mastered, streak] = await Promise.all([
    adminControls(),
    getStudent(studentId),
    findTodaySession(studentId),
    studentXp(studentId),
    masteredConcepts(studentId),
    studentStreak(studentId, new Date()),
  ]);
  const currentKey = today.kind === "complete" ? null : today.contentKey;
  const progress = courseProgress(ALGEBRA1_COURSE, mastered);

  return (
    <StudentShell
      active="/student/course"
      student={student}
      standing={{ xp, mastered, streak }}
      controls={controls}
    >
      {() => (
        <section aria-labelledby="map-heading" className="flex flex-col gap-6">
          <PageHeader id="map-heading" title="Course">
            <p>
              {ALGEBRA1_TITLE} in the order the New York State standards teach it: {progress.units}{" "}
              units, {progress.total} concepts, each with its standard code. {progress.mastered}{" "}
              mastered, {progress.unitsDone} of {progress.units} units done. Only today&apos;s
              concept opens a session.
            </p>
          </PageHeader>
          <CourseMap
            units={ALGEBRA1_COURSE}
            mastered={mastered}
            currentKey={currentKey}
            today={currentKey === null ? undefined : startTodaySession}
            unitHeading="h2"
          />
        </section>
      )}
    </StudentShell>
  );
}
