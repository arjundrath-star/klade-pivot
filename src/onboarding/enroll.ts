import { randomInt, randomUUID } from "node:crypto";
import { firstConcept } from "@/db/queries/schedule";
import { createFamily } from "@/db/queries/students";
import { addDays, scheduleDays } from "@/engine/pace";
import { planAlgebra1 } from "@/onboarding/plan";
import type { OnboardingInput } from "@/onboarding/schema";
import { calendarDay, clockTime } from "@/parent/progress";

/** Onboarding writes this many days of schedule rows; the plan's weekdays carry it on after. */
const SCHEDULE_DAYS_AHEAD = 14;

export type EnrollError = "target-too-soon" | "target-too-far" | "misses-target";

export type EnrollResult = { ok: true; studentId: string } | { ok: false; error: EnrollError };

/**
 * Creates the family, the student and the first two weeks of the student's schedule. The plan
 * starts today, in the family's time zone, and is checked again here: a pace that cannot finish
 * by the target is refused, so the deadline never moves without the parent seeing it.
 */
export async function enrollStudent(input: OnboardingInput, now: Date): Promise<EnrollResult> {
  const today = calendarDay(now);
  const planned = planAlgebra1(today, input.targetDate, input.pace);
  if (!planned.ok) return { ok: false, error: planned.error };
  if (!planned.plan.onTime) return { ok: false, error: "misses-target" };

  // A new student has mastered nothing, so the planner starts them on the course's first concept.
  const sessionTemplateId = await firstConcept();
  const studentId = randomUUID();
  // Past today's start time, today's session is not owed: the schedule starts tomorrow.
  const first = clockTime(now) < input.sessionTime ? today : addDays(today, 1);
  const days = scheduleDays(first, addDays(first, SCHEDULE_DAYS_AHEAD - 1), input.sessionDays);
  await createFamily(
    input.parentName,
    {
      id: studentId,
      familyId: randomUUID(),
      name: input.studentName,
      grade: input.grade,
      pronoun: input.pronoun,
      targetDate: input.targetDate,
      pacePerWeek: planned.plan.sessionsPerWeek,
      sessionDays: input.sessionDays,
      sessionTime: input.sessionTime,
      timerMode: input.timerMode,
      interests: input.interests,
      favorites: input.favorites,
    },
    days.map((day) => ({ day, sessionTemplateId, seed: randomInt(0, 2 ** 32) })),
  );
  return { ok: true, studentId };
}
