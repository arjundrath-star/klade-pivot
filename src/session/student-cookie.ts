import { z } from "zod";

/**
 * Which student a browser acts as. Onboarding sets it to the new student's id, the proxy sets it
 * for a browser that arrives with nothing, and the student pages act as that student. The id is a
 * random UUID, so the cookie is as hard to guess as one.
 */
export const STUDENT_COOKIE = "klade_student";

export const StudentId = z.uuid();

/** The student id a cookie value names, or undefined for no cookie or anything but a UUID. */
export function studentIdOf(value: string | undefined): string | undefined {
  const parsed = StudentId.safeParse(value);
  return parsed.success ? parsed.data : undefined;
}
