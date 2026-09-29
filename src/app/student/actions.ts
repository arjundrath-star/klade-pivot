"use server";

import { randomInt } from "node:crypto";
import { redirect } from "next/navigation";
import { DEMO_STUDENT_ID } from "@/db/demo";
import { openTodaySession } from "@/db/queries/sessions";

/** Opens (or resumes) today's session and sends the student into it. */
export async function startTodaySession(): Promise<void> {
  const sessionId = await openTodaySession(DEMO_STUDENT_ID, randomInt(0, 2 ** 32));
  redirect(sessionId === null ? "/student" : `/student/session/${sessionId}`);
}
