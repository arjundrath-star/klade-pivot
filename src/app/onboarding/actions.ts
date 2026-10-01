"use server";

import { redirect } from "next/navigation";
import type { z } from "zod";
import { enrollStudent, type EnrollError } from "@/onboarding/enroll";
import { OnboardingInput } from "@/onboarding/schema";
import { rememberStudent } from "@/session/current-student";

export type OnboardingError = EnrollError | "invalid";

/**
 * Creates the family, the student and the schedule, makes this browser act as the new student and
 * sends it to /student. Comes back only with an error.
 */
export async function completeOnboarding(
  input: z.input<typeof OnboardingInput>,
): Promise<{ ok: false; error: OnboardingError }> {
  const parsed = OnboardingInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const enrolled = await enrollStudent(parsed.data, new Date());
  if (!enrolled.ok) return enrolled;
  await rememberStudent(enrolled.studentId);
  redirect("/student");
}
