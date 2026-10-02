/**
 * The calendar's arithmetic, on YYYY-MM-DD and YYYY-MM strings in the family's calendar. Pure:
 * the week strip on the student's home and the month view share it.
 */
import { addDays, daysBetween, WEEKDAYS, weekdayOf, type ScheduleSlot } from "@/engine/pace";

/** What a day on the calendar reads as. */
export type DayState = "done" | "missed" | "scheduled";

/** A month this century, YYYY-MM. */
export const MONTH_PATTERN = /^20\d{2}-(0[1-9]|1[0-2])$/;

/** "2026-10" for "2026-10-01". */
export function monthOf(day: string): string {
  return day.slice(0, 7);
}

export function monthStart(month: string): string {
  return `${month}-01`;
}

/** The month's last day: the day before the next month starts. */
export function monthEnd(month: string): string {
  return addDays(monthStart(shiftMonth(month, 1)), -1);
}

/** The month `by` months after `month` (negative for before). */
export function shiftMonth(month: string, by: number): string {
  const [year, index] = month.split("-").map(Number);
  const shifted = new Date(Date.UTC(year, index - 1 + by, 1));
  return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, "0")}`;
}

const monthFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: "UTC",
  month: "long",
  year: "numeric",
});

/** "October 2026" for "2026-10". */
export function monthLabel(month: string): string {
  return monthFormat.format(new Date(`${monthStart(month)}T00:00:00Z`));
}

/**
 * The month's days as the cells of a seven-column grid, Monday first, with null in the cells
 * before the first day and after the last so the rows fill out.
 */
export function monthGrid(month: string): (string | null)[] {
  const first = monthStart(month);
  const days = daysBetween(first, monthEnd(month)) + 1;
  const cells: (string | null)[] = Array.from(
    { length: WEEKDAYS.indexOf(weekdayOf(first)) },
    () => null,
  );
  for (let offset = 0; offset < days; offset++) cells.push(addDays(first, offset));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

/** Monday through Sunday of the week `day` falls in. */
export function weekOf(day: string): string[] {
  const monday = addDays(day, -WEEKDAYS.indexOf(weekdayOf(day)));
  return Array.from({ length: 7 }, (_, offset) => addDays(monday, offset));
}

/**
 * Each day's state from `from` through `to`. `slots` is the plan as the pace engine reads it
 * (`plannedSlots`: the schedule rows, carried on through the last day asked for). A plan day a
 * session finished on is done. A plan day before today without one is missed, the way the engine
 * counts it owed, and so is today once its row says so; otherwise a plan day is scheduled. A
 * session finished on a day off the plan shows as done too. Days with neither stay blank.
 */
export function dayStates(
  slots: readonly ScheduleSlot[],
  completedDays: readonly string[],
  today: string,
  from: string,
  to: string,
): Map<string, DayState> {
  const completed = new Set(completedDays);
  const states = new Map<string, DayState>();
  for (const { day, status } of slots) {
    if (day < from || day > to) continue;
    const missed = day < today || status === "missed";
    states.set(day, completed.has(day) ? "done" : missed ? "missed" : "scheduled");
  }
  for (const day of completed) {
    if (day >= from && day <= to && !states.has(day)) states.set(day, "done");
  }
  return states;
}

/** The first scheduled day on or after `today`, if the states hold one. */
export function nextSessionDay(
  states: ReadonlyMap<string, DayState>,
  today: string,
): string | undefined {
  let next: string | undefined;
  for (const [day, state] of states) {
    if (state === "scheduled" && day >= today && (next === undefined || day < next)) next = day;
  }
  return next;
}
