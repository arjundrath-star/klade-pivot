import { z } from "zod";
import { FAVORITES } from "@/content/interests";
import {
  CLOCK_TIME_PATTERN,
  isCalendarDay,
  PACE_PRESETS,
  PRESET_SESSIONS,
  WEEKDAYS,
} from "@/engine/pace";
import { INTERESTS } from "@/engine/types";
import { GRADES, NAME_MAX, NAME_PATTERN } from "@/onboarding/fields";
import { PRONOUNS } from "@/parent/pronouns";
import { LOCK_CATEGORIES, WEEKEND } from "@/session/lock";
import { TIMER_MODES } from "@/session/timer";

const FirstName = z.string().trim().min(1).max(NAME_MAX).regex(NAME_PATTERN);

const distinct = (values: readonly string[]) => new Set(values).size === values.length;

/**
 * The phone rule as the parent edits it, in onboarding and on /parent/settings. At least one day
 * it can lock on and one category: a rule that can lock nothing is the switch's job.
 */
export const LockRuleInput = z
  .strictObject({
    days: z.array(z.enum(WEEKDAYS)).min(1).refine(distinct),
    startTime: z.string().regex(CLOCK_TIME_PATTERN),
    categories: z.array(z.enum(LOCK_CATEGORIES)).min(1).refine(distinct),
    weekendOff: z.boolean(),
  })
  .refine((rule) => !rule.weekendOff || rule.days.some((day) => !WEEKEND.includes(day)), {
    path: ["days"],
    message: "With weekends off, pick a weekday",
  });

export type LockRuleInput = z.infer<typeof LockRuleInput>;

/**
 * Everything onboarding stores, and nothing else: a strict object, so a field the form does not
 * send (an email, a birthdate) is refused rather than dropped.
 */
export const OnboardingInput = z
  .strictObject({
    parentName: FirstName,
    studentName: FirstName,
    grade: z
      .number()
      .int()
      .min(GRADES[0])
      .max(GRADES[GRADES.length - 1]),
    pronoun: z.enum(PRONOUNS),
    targetDate: z.string().refine(isCalendarDay),
    pace: z.enum(PACE_PRESETS),
    sessionDays: z.array(z.enum(WEEKDAYS)).refine(distinct),
    sessionTime: z.string().regex(CLOCK_TIME_PATTERN),
    timerMode: z.enum(TIMER_MODES),
    interests: z.array(z.enum(INTERESTS)).min(1).max(2).refine(distinct),
    favorites: z.partialRecord(z.enum(INTERESTS), z.string().max(40)),
    // Null when the parent skipped the phone rule step.
    lockRule: LockRuleInput.nullable(),
  })
  .refine((input) => input.sessionDays.length === PRESET_SESSIONS[input.pace], {
    path: ["sessionDays"],
    message: "One session day per session a week",
  })
  .refine(
    (input) =>
      INTERESTS.every((interest) => {
        const favorite = input.favorites[interest];
        return (
          favorite === undefined ||
          (input.interests.includes(interest) && FAVORITES[interest].includes(favorite))
        );
      }),
    { path: ["favorites"], message: "A favorite belongs to a picked interest and its list" },
  );

export type OnboardingInput = z.infer<typeof OnboardingInput>;
