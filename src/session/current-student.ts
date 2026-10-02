import { cookies } from "next/headers";
import { z } from "zod";
import { DEMO_STUDENT_ID } from "@/db/demo";
import { httpOnlyCookie, SCHOOL_YEAR_SECONDS } from "@/session/cookies";

/**
 * Sign-in is not built yet. Onboarding sets this cookie to the new student's id, and the student
 * pages act as that student; a browser without it acts as the demo student. The id is a random
 * UUID, so the cookie is as hard to guess as one.
 */
const STUDENT_COOKIE = "klade_student";

const StudentId = z.uuid();

/** The student the student pages, the session actions and the coach act as. */
export async function currentStudentId(): Promise<string> {
  const parsed = StudentId.safeParse((await cookies()).get(STUDENT_COOKIE)?.value);
  return parsed.success ? parsed.data : DEMO_STUDENT_ID;
}

/** Makes this browser act as `studentId` from the next request on. Server actions only. */
export async function rememberStudent(studentId: string): Promise<void> {
  (await cookies()).set(
    STUDENT_COOKIE,
    StudentId.parse(studentId),
    httpOnlyCookie(SCHOOL_YEAR_SECONDS),
  );
}

/** Makes this browser act as the demo student again. Server actions only. */
export async function forgetStudent(): Promise<void> {
  (await cookies()).delete(STUDENT_COOKIE);
}
