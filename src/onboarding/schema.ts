import { z } from "zod";
import { FAVORITES } from "@/content/interests";
import { isCalendarDay, PACE_PRESETS, PRESET_SESSIONS, WEEKDAYS } from "@/engine/pace";
import { INTERESTS } from "@/engine/types";
import { GRADES, NAME_MAX, NAME_PATTERN } from "@/onboarding/fields";
import { PRONOUNS } from "@/parent/pronouns";
import { TIMER_MODES } from "@/session/timer";

const FirstName = z.string().trim().min(1).max(NAME_MAX).regex(NAME_PATTERN);

const distinct = (values: readonly string[]) => new Set(values).size === values.length;

/**
 * Everything onboarding stores, and nothing else: a strict object, so a field the form does not
 * send (an email, a birthdate) is refused rather than dropped.
 */
export const OnboardingInput = z
  .strictObject({
    parentName: FirstName,
    studentName: FirstName,
    grade: z.number().int().min(GRADES[0]).max(GRADES[GRADES.length - 1]),
    pronoun: z.enum(PRONOUNS),
    targetDate: z.string().refine(isCalendarDay),
    pace: z.enum(PACE_PRESETS),
    sessionDays: z.array(z.enum(WEEKDAYS)).refine(distinct),
    // 24-hour "HH:MM", as a time input sends it.
    sessionTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
    timerMode: z.enum(TIMER_MODES),
    interests: z.array(z.enum(INTERESTS)).min(1).max(2).refine(distinct),
    favorites: z.partialRecord(z.enum(INTERESTS), z.string().max(40)),
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
