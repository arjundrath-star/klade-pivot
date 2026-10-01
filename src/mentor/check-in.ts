/** When the mentor's weekly check-in falls, in the family's time zone. */
import { addDays, scheduleDays, type Weekday } from "@/engine/pace";
import { calendarDay, familyMoment, formatDay } from "@/parent/progress";
import { timeLabel } from "@/parent/phone-rule";

/** Check-ins are 10 minutes (steering §3.3). */
export const CHECK_IN_MINUTES = 10;

/** The family's calendar day of the next check-in on `weekday` at `time` that has not ended. */
export function nextCheckInDay(weekday: Weekday, time: string, now: Date): string {
  const today = calendarDay(now);
  // Today's slot until it ends, then the one a week on.
  const [first, next] = scheduleDays(today, addDays(today, 7), [weekday]);
  const ends = familyMoment(first, time).getTime() + CHECK_IN_MINUTES * 60_000;
  return ends > now.getTime() ? first : next;
}

/** The check-in a week before the next one: the last that has ended. */
export function lastCheckInDay(weekday: Weekday, time: string, now: Date): string {
  return addDays(nextCheckInDay(weekday, time, now), -7);
}

/** "Thu, Oct 8, 7:00 PM". */
export function checkInLabel(day: string, time: string): string {
  return `${formatDay(day)}, ${timeLabel(time)}`;
}
