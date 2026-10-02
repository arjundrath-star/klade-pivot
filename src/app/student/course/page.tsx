import type { Metadata } from "next";
import { connection } from "next/server";
import { startTodaySession } from "../actions";
import { StudentShell } from "../student-shell";
import { adminControls } from "@/admin/controls";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { PanelHeader } from "@/components/ui/panel-header";
import { ALGEBRA1_COURSE, ALGEBRA1_TITLE } from "@/content/algebra1/course";
import { CourseMap } from "@/course/course-map";
import { masteredConcepts } from "@/db/queries/rewards";
import { findTodaySession } from "@/db/queries/sessions";
import { getStudent } from "@/db/queries/students";
import { courseProgress } from "@/engine/course";
import { currentStudentId } from "@/session/current-student";

export const metadata: Metadata = { title: "Course · Klade" };

export default async function CoursePage() {
  await connection();
  const studentId = await currentStudentId();
  const [controls, student, today, mastered] = await Promise.all([
    adminControls(),
    getStudent(studentId),
    findTodaySession(studentId),
    masteredConcepts(studentId),
  ]);
  const currentKey = today.kind === "complete" ? null : today.contentKey;
  const progress = courseProgress(ALGEBRA1_COURSE, mastered);

  return (
    <StudentShell
      active="/student/course"
      student={student}
      mastered={mastered}
      controls={controls}
    >
      {() => (
        <>
          <PageHeader title="Course">
            <p>
              {ALGEBRA1_TITLE}: {progress.mastered} of {progress.total} concepts mastered,{" "}
              {progress.unitsDone} of {progress.units} units done.
            </p>
          </PageHeader>
          <Card aria-labelledby="map-heading" className="flex flex-col gap-5">
            <PanelHeader id="map-heading" title="Course map" size="lg">
              <p>
                {ALGEBRA1_TITLE} in the order the New York State standards teach it:{" "}
                {progress.units} units, {progress.total} concepts, each with its standard code. Only
                today&apos;s concept opens a session.
              </p>
            </PanelHeader>
            <CourseMap
              units={ALGEBRA1_COURSE}
              mastered={mastered}
              currentKey={currentKey}
              today={currentKey === null ? undefined : startTodaySession}
            />
          </Card>
        </>
      )}
    </StudentShell>
  );
}
