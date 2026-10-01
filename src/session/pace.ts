import { scheduleSlots, sessionActivity } from "@/db/queries/schedule";
import { getStudent } from "@/db/queries/students";
import { calendarDay, plannedSlots, sessionsBehind } from "@/parent/progress";

/**
 * Sessions the student owes against their schedule as of `now`: the stored schedule rows, carried
 * on past them on the plan's weekdays (`plannedSlots`).
 */
export async function studentPace(studentId: string, now: Date): Promise<number> {
  const [student, slots, { completed }] = await Promise.all([
    getStudent(studentId),
    scheduleSlots(studentId),
    sessionActivity(studentId),
  ]);
  const today = calendarDay(now);
  const schedule = plannedSlots(slots, student?.sessionDays ?? [], today);
  return sessionsBehind(schedule, completed.map(calendarDay), today);
}
