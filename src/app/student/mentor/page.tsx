import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { StudentShell } from "../student-shell";
import { adminControls } from "@/admin/controls";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { mentorFor } from "@/db/queries/mentor";
import { latestExplanation } from "@/db/queries/parent";
import { masteredConcepts, studentXp } from "@/db/queries/rewards";
import { MentorCard } from "@/mentor/mentor-card";
import { studentOnPage } from "@/session/current-student";
import { studentStreak } from "@/session/pace";

export const metadata: Metadata = { title: "Mentor" };

export default async function MentorPage() {
  await connection();
  const { id: studentId, student } = await studentOnPage("/student/mentor");
  const [controls, xp, mastered, streak, mentor, explanation] = await Promise.all([
    adminControls(),
    studentXp(studentId),
    masteredConcepts(studentId),
    studentStreak(studentId, new Date()),
    mentorFor(studentId),
    latestExplanation(studentId),
  ]);

  return (
    <StudentShell
      active="/student/mentor"
      student={student}
      standing={{ xp, mastered, streak }}
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
