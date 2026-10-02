"use server";

import { redirect } from "next/navigation";
import { sessionSeedFor } from "@/db/demo";
import { openTodaySession } from "@/db/queries/sessions";
import { currentStudentId } from "@/session/current-student";

/** Opens (or resumes) today's session and sends the student into it. */
export async function startTodaySession(): Promise<void> {
  const studentId = await currentStudentId();
  const sessionId = await openTodaySession(studentId, sessionSeedFor(studentId));
  redirect(sessionId === null ? "/student" : `/student/session/${sessionId}`);
}
