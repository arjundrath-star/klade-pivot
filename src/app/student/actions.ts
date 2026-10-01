"use server";

import { randomInt } from "node:crypto";
import { redirect } from "next/navigation";
import { openTodaySession } from "@/db/queries/sessions";
import { currentStudentId } from "@/session/current-student";

/** Opens (or resumes) today's session and sends the student into it. */
export async function startTodaySession(): Promise<void> {
  const sessionId = await openTodaySession(await currentStudentId(), randomInt(0, 2 ** 32));
  redirect(sessionId === null ? "/student" : `/student/session/${sessionId}`);
}
