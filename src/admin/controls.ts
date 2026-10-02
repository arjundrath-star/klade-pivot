import { cookies } from "next/headers";
import { ribbonHidden, RIBBON_COOKIE } from "./ribbon-cookie";
import { lockSettings } from "@/db/queries/lock";
import { getStudent } from "@/db/queries/students";
import type { Interest } from "@/engine/types";
import { signedInFamily } from "@/gate/server";
import { timeLabel } from "@/parent/phone-rule";
import { calendarDay } from "@/parent/progress";
import { demoClockFor } from "@/session/lock";

/**
 * What the admin ribbon needs: the demo student and her interests, the demo clock's label, and whether
 * this browser folded the ribbon into its pill.
 */
export interface AdminControls {
  /** The demo student, the only one the session's demo skip works for. */
  studentId: string;
  interests: readonly Interest[];
  clockLabel: string;
  hidden: boolean;
}

type Settings = NonNullable<Awaited<ReturnType<typeof lockSettings>>>;

/** "Simulate: session day, 5:05 PM": the demo clock button, labeled with the rule's start time. */
export function demoClockLabel(settings: Settings): string {
  const { time } = demoClockFor(settings.rule, settings, calendarDay(new Date()));
  return `Simulate: session day, ${timeLabel(time)}`;
}

/**
 * The ribbon's inputs for a browser signed in at the gate (`signedInFamily`, the gate's own check
 * of its cookie), else null for everyone else. The student pages fetch this beside their own
 * data, so the ribbon adds no round trip of its own.
 */
export async function adminControls(): Promise<AdminControls | null> {
  const family = await signedInFamily();
  if (!family) return null;
  const [student, settings, jar] = await Promise.all([
    getStudent(family.studentId),
    lockSettings(family.familyId, family.studentId),
    cookies(),
  ]);
  if (!student || !settings) return null;
  return {
    studentId: family.studentId,
    interests: student.interests,
    clockLabel: demoClockLabel(settings),
    hidden: ribbonHidden(jar.get(RIBBON_COOKIE)?.value),
  };
}
