import { cookies } from "next/headers";
import { z } from "zod";
import { DEMO_STUDENT_ID } from "@/db/demo";

/**
 * Sign-in is not built yet. Onboarding sets this cookie to the new student's id, and the student
 * pages act as that student; a browser without it acts as the demo student. The id is a random
 * UUID, so the cookie is as hard to guess as one.
 */
const STUDENT_COOKIE = "klade_student";

const StudentId = z.uuid();

// About a school year, long enough to outlast the MVP pilot.
const STUDENT_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/** The student the student pages, the session actions and the coach act as. */
export async function currentStudentId(): Promise<string> {
  const parsed = StudentId.safeParse((await cookies()).get(STUDENT_COOKIE)?.value);
  return parsed.success ? parsed.data : DEMO_STUDENT_ID;
}

/** Makes this browser act as `studentId` from the next request on. Server actions only. */
export async function rememberStudent(studentId: string): Promise<void> {
  (await cookies()).set(STUDENT_COOKIE, StudentId.parse(studentId), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: STUDENT_COOKIE_MAX_AGE,
  });
}
