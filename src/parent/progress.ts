/** Where a student stands against their schedule. Pure: the parent view and the admin panel share it. */
import { scheduleDays, type Weekday } from "@/engine/pace";

/**
 * The demo family's time zone. "Today" for the schedule is the family's calendar day, not the
 * server's, which runs on UTC.
 */
const SCHEDULE_TIME_ZONE = "America/New_York";

const dayFormat = new Intl.DateTimeFormat("en-CA", {
  timeZone: SCHEDULE_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** The family's calendar day at `at`, as YYYY-MM-DD. */
export function calendarDay(at: Date): string {
  return dayFormat.format(at);
}

const timeFormat = new Intl.DateTimeFormat("en-GB", {
  timeZone: SCHEDULE_TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** The family's clock time at `at`, as 24-hour HH:MM. */
export function clockTime(at: Date): string {
  return timeFormat.format(at);
}

/** One day the schedule holds a session on. */
export interface ScheduleSlot {
  /** YYYY-MM-DD */
  day: string;
  status: "scheduled" | "missed";
}

function firstDay(slots: readonly ScheduleSlot[]): string {
  return slots.reduce((first, slot) => (slot.day < first ? slot.day : first), slots[0].day);
}

/**
 * The stored schedule rows plus a `scheduled` slot for every day on the student's weekdays from
 * the first row through `today` that has no row. Onboarding writes the first two weeks of rows;
 * the weekdays carry the schedule on past them. No rows means no schedule yet.
 */
export function plannedSlots(
  slots: readonly ScheduleSlot[],
  weekdays: readonly Weekday[],
  today: string,
): ScheduleSlot[] {
  if (slots.length === 0) return [];
  const stored = new Set(slots.map((slot) => slot.day));
  const planned = scheduleDays(firstDay(slots), today, weekdays)
    .filter((day) => !stored.has(day))
    .map((day) => ({ day, status: "scheduled" as const }));
  return [...slots, ...planned];
}

/**
 * Sessions owed and not done since the schedule started: every schedule day before today, plus
 * today once it is marked missed, less the sessions completed (decision D33: the exit check
 * attempted unaided) on or after the first schedule day. A make-up session on any later day closes
 * the gap; sessions from before the schedule started do not count against it. Never negative.
 */
export function sessionsBehind(
  slots: readonly ScheduleSlot[],
  completedDays: readonly string[],
  today: string,
): number {
  if (slots.length === 0) return 0;
  const start = firstDay(slots);
  const due = slots.filter(
    (slot) => slot.day < today || (slot.day === today && slot.status === "missed"),
  ).length;
  const completed = completedDays.filter((day) => day >= start).length;
  return Math.max(0, due - completed);
}

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

/** The month of an ISO date, read from the string so no time zone can shift it: "May". */
export function targetMonth(targetDate: string): string {
  const month = MONTHS[Number(targetDate.slice(5, 7)) - 1];
  if (!month) throw new Error(`Not an ISO date: ${targetDate}`);
  return month;
}

/** "1 hint", "2 hints". */
export function plural(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

/** "1 session", "2 sessions". */
export function sessionCount(count: number): string {
  return plural(count, "session");
}

/** The parent view's one-line status: "On track for May" or "2 sessions behind". */
export function progressLine(behind: number, targetDate: string): string {
  return behind === 0
    ? `On track for ${targetMonth(targetDate)}`
    : `${sessionCount(behind)} behind`;
}

const dayLabel = new Intl.DateTimeFormat("en-US", {
  timeZone: "UTC",
  weekday: "short",
  month: "short",
  day: "numeric",
});

const dateLabel = new Intl.DateTimeFormat("en-US", {
  timeZone: "UTC",
  month: "long",
  day: "numeric",
  year: "numeric",
});

/** "Thu, Oct 1" for the calendar day "2026-10-01". */
export function formatDay(day: string): string {
  return dayLabel.format(new Date(`${day}T00:00:00Z`));
}

/** "May 31, 2027" for the date "2027-05-31". */
export function formatDate(day: string): string {
  return dateLabel.format(new Date(`${day}T00:00:00Z`));
}
