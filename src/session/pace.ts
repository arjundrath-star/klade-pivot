import { scheduleSlots, sessionActivity } from "@/db/queries/schedule";
import { calendarDay, sessionsBehind } from "@/parent/progress";

/** Sessions the student owes against their schedule as of `now`. */
export async function studentPace(studentId: string, now: Date): Promise<number> {
  const [slots, { completed }] = await Promise.all([
    scheduleSlots(studentId),
    sessionActivity(studentId),
  ]);
  return sessionsBehind(slots, completed.map(calendarDay), calendarDay(now));
}
