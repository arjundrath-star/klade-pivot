"use server";

import { redirect } from "next/navigation";
import { sessionSeedFor } from "@/db/demo";
import { openTodaySession } from "@/db/queries/sessions";
import { resetVisitor } from "@/db/visitors";
import { currentStudent } from "@/session/current-student";

/** Opens (or resumes) today's session and sends the student into it. */
export async function startTodaySession(): Promise<void> {
  const student = await currentStudent();
  const sessionId = student
    ? await openTodaySession(
        student.id,
        sessionSeedFor({ studentId: student.id, visitor: student.visitor }),
      )
    : null;
  redirect(sessionId ? `/student/session/${sessionId}` : "/student");
}

/**
 * Puts a visitor's copy of the demo back to its starting state (milestone 20): Maya's record, the
 * phone locked, today's session waiting. Only a visitor's family is reset; any other browser just
 * comes back to the student's home.
 */
export async function restartDemo(): Promise<void> {
  const student = await currentStudent();
  if (student) await resetVisitor(student.id);
  redirect("/student");
}
