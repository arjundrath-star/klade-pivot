import { lockSettings } from "@/db/queries/lock";
import { getStudent } from "@/db/queries/students";
import type { Interest } from "@/engine/types";
import { signedInFamily } from "@/gate/server";
import { timeLabel } from "@/parent/phone-rule";
import { calendarDay } from "@/parent/progress";
import { demoClockFor } from "@/session/lock";

/** What the admin ribbon needs from the demo student: her interests and the demo clock's label. */
export interface AdminControls {
  interests: readonly Interest[];
  clockLabel: string;
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
  const [student, settings] = await Promise.all([
    getStudent(family.studentId),
    lockSettings(family.familyId, family.studentId),
  ]);
  if (!student || !settings) return null;
  return { interests: student.interests, clockLabel: demoClockLabel(settings) };
}
