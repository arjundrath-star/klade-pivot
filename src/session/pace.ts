import { scheduleSlots, sessionActivity } from "@/db/queries/schedule";
import { getStudent } from "@/db/queries/students";
import type { ScheduleSlot, Weekday } from "@/engine/pace";
import { streak, type Streak } from "@/engine/progress";
import { calendarDay, plannedSlots, sessionsBehind } from "@/parent/progress";

/** The student's schedule carried on through `today`, and when their sessions finished. */
interface ScheduleRecord {
  schedule: ScheduleSlot[];
  completed: Date[];
}

/**
 * The student's schedule as of `today`: the stored schedule rows, carried on past them on the
 * plan's weekdays (`plannedSlots`), with the time every completed session finished.
 * Pass `sessionDays` when the caller already has the student's weekdays.
 */
export async function scheduleRecord(
  studentId: string,
  today: string,
  sessionDays?: readonly Weekday[],
): Promise<ScheduleRecord> {
  const [weekdays, slots, { completed }] = await Promise.all([
    sessionDays ?? getStudent(studentId).then((student) => student?.sessionDays ?? []),
    scheduleSlots(studentId),
    sessionActivity(studentId),
  ]);
  return {
    schedule: plannedSlots(slots, weekdays, today),
    completed,
  };
}

/** Where the student stands against their schedule as of `now`: sessions owed and the streak. */
export async function studentStanding(
  studentId: string,
  now: Date,
): Promise<{ behind: number; streak: Streak }> {
  const today = calendarDay(now);
  const { schedule, completed } = await scheduleRecord(studentId, today);
  const completedDays = completed.map(calendarDay);
  return {
    behind: sessionsBehind(schedule, completedDays, today),
    streak: streak(schedule, completedDays, today),
  };
}

/** Sessions the student owes against their schedule as of `now`. */
export async function studentPace(studentId: string, now: Date): Promise<number> {
  const today = calendarDay(now);
  const { schedule, completed } = await scheduleRecord(studentId, today);
  return sessionsBehind(schedule, completed.map(calendarDay), today);
}
