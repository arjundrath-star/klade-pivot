import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { StudentShell } from "../student-shell";
import { adminControls } from "@/admin/controls";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { mentorFor } from "@/db/queries/mentor";
import { latestExplanation } from "@/db/queries/parent";
import { masteredConcepts } from "@/db/queries/rewards";
import { getStudent } from "@/db/queries/students";
import { MentorCard } from "@/mentor/mentor-card";
import { currentStudentId } from "@/session/current-student";

export const metadata: Metadata = { title: "Mentor" };

export default async function MentorPage() {
  await connection();
  const studentId = await currentStudentId();
  const [controls, student, mastered, mentor, explanation] = await Promise.all([
    adminControls(),
    getStudent(studentId),
    masteredConcepts(studentId),
    mentorFor(studentId),
    latestExplanation(studentId),
  ]);

  return (
    <StudentShell
      active="/student/mentor"
      student={student}
      mastered={mastered}
      controls={controls}
    >
      {() => (
        <>
          <PageHeader title="Mentor">
            <p>
              A college student who reads your explain-backs and checks in with you for ten minutes
              a week.
            </p>
          </PageHeader>
          {mentor ? (
            <div className="max-w-2xl">
              <MentorCard
                mentor={mentor}
                now={new Date()}
                student={{ viewer: "student", explanation }}
              />
            </div>
          ) : (
            <Card className="flex max-w-2xl flex-col gap-3">
              <p className="max-w-prose text-ink-soft">
                No mentor yet. Mentors are a premium prototype; the waiting room shows how a
                check-in would start.
              </p>
              <Link href="/mentor/waiting-room" className="link self-start">
                See the waiting room
              </Link>
            </Card>
          )}
        </>
      )}
    </StudentShell>
  );
}
