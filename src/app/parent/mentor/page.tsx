import type { Metadata } from "next";
import { connection } from "next/server";
import { ParentShell } from "../parent-shell";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { mentorFor } from "@/db/queries/mentor";
import { getStudent } from "@/db/queries/students";
import { gatedFamily } from "@/gate/server";
import { MentorCard } from "@/mentor/mentor-card";

export const metadata: Metadata = { title: "Mentor · Klade" };

export default async function ParentMentorPage() {
  await connection();
  const { studentId } = await gatedFamily("/parent/mentor");
  const [student, mentor] = await Promise.all([getStudent(studentId), mentorFor(studentId)]);

  return (
    <ParentShell active="/parent/mentor" student={student}>
      {({ name }) => (
        <div className="flex max-w-3xl flex-col gap-6">
          <PageHeader title="Mentor">
            <p>
              A college student who reads {name}&apos;s explain-backs and checks in for ten minutes
              a week. Every check-in happens in Klade and is recorded; you can join any of them.
            </p>
          </PageHeader>
          {mentor ? (
            <MentorCard mentor={mentor} now={new Date()} student={{ viewer: "parent", name }} />
          ) : (
            <Card>
              <p className="text-ink-soft">No mentor yet. Mentors are a premium prototype.</p>
            </Card>
          )}
        </div>
      )}
    </ParentShell>
  );
}
