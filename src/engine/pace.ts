/**
 * The pace calculator (spec §3.1, memo §6.3). From the course's session count, a start date, a
 * target finish date and a pace, it works out sessions per week, weekly time, weeks and the date
 * each unit should be done by. Pure: dates are calendar days (YYYY-MM-DD) with no time zone.
 */

/** Sessions in Algebra 1. [Estimate] memo §6.3: about 120, to be validated with teachers. */
export const ALGEBRA1_SESSION_ESTIMATE = 120;

/** Every session is 30 minutes (spec §3.2). */
export const SESSION_MINUTES = 30;

/** More than this many sessions a week is not a plan a family can keep. */
export const MAX_SESSIONS_PER_WEEK = 6;

export const PACE_PRESETS = ["standard", "on-track", "intensive"] as const;

export type PacePreset = (typeof PACE_PRESETS)[number];

export const PRESET_SESSIONS: Readonly<Record<PacePreset, number>> = {
  standard: 3,
  "on-track": 4,
  intensive: 6,
};

export const WEEKDAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;

export type Weekday = (typeof WEEKDAYS)[number];

export const WEEKDAY_LABELS: Readonly<Record<Weekday, string>> = {
  mon: "Mon",
  tue: "Tue",
  wed: "Wed",
  thu: "Thu",
  fri: "Fri",
  sat: "Sat",
  sun: "Sun",
};

// The presets' days come from the milestone; the rest spread the sessions across the week.
const PROPOSED_DAYS: Readonly<Record<number, readonly Weekday[]>> = {
  1: ["mon"],
  2: ["tue", "thu"],
  3: ["mon", "wed", "fri"],
  4: ["mon", "tue", "thu", "sun"],
  5: ["mon", "tue", "wed", "thu", "fri"],
  6: ["mon", "tue", "wed", "thu", "fri", "sat"],
};

/** Sessions start at 5:00 PM unless the family picks another time. 24-hour "HH:MM". */
export const DEFAULT_SESSION_TIME = "17:00";

/** A 24-hour "HH:MM" clock time, as a time input sends it. */
export const CLOCK_TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

/** One day the schedule holds a session on. */
export interface ScheduleSlot {
  /** YYYY-MM-DD */
  day: string;
  status: "scheduled" | "missed";
}

/** A unit of the course and how many sessions it takes. */
export interface UnitEstimate {
  title: string;
  sessions: number;
}

export interface Milestone {
  title: string;
  /** The day the unit should be done by. */
  date: string;
}

/** A preset, or an explicit number of sessions a week (1 to 6). */
export type Pace = { preset: PacePreset } | { sessionsPerWeek: number };

export interface PacePlan {
  sessionsPerWeek: number;
  weeklyMinutes: number;
  weeks: number;
  /** The last day of the week the final session falls in. */
  finishDate: string;
  /** The fewest sessions a week that finish by the target. */
  requiredPerWeek: number;
  /** The plan finishes on or before the target. */
  onTime: boolean;
  /** One per unit, in course order. */
  milestones: Milestone[];
}

export type PaceResult =
  | { ok: true; plan: PacePlan }
  /** Even 6 sessions a week cannot finish by the target. `earliestTarget` is the soonest that can. */
  | { ok: false; error: "target-too-soon"; earliestTarget: string };

interface PaceInput {
  totalSessions: number;
  units: readonly UnitEstimate[];
  /** The first day of the plan. */
  start: string;
  target: string;
  pace: Pace;
}

const DAY_MS = 86_400_000;

function dayTime(day: string): number {
  if (!isCalendarDay(day)) throw new RangeError(`Not a calendar day: ${day}`);
  return Date.parse(`${day}T00:00:00Z`);
}

/** True for a real date written YYYY-MM-DD ("2027-02-30" is not one). */
export function isCalendarDay(day: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return false;
  const time = Date.parse(`${day}T00:00:00Z`);
  return !Number.isNaN(time) && new Date(time).toISOString().startsWith(day);
}

export function addDays(day: string, days: number): string {
  return new Date(dayTime(day) + days * DAY_MS).toISOString().slice(0, 10);
}

/** Days from `from` to `to`: 1 from one day to the next, negative when `to` comes first. */
export function daysBetween(from: string, to: string): number {
  return Math.round((dayTime(to) - dayTime(from)) / DAY_MS);
}

export function weekdayOf(day: string): Weekday {
  // getUTCDay counts from Sunday; WEEKDAYS starts on Monday.
  return WEEKDAYS[(new Date(dayTime(day)).getUTCDay() + 6) % 7];
}

/** How many days of schedule rows a new schedule starts with; the weekdays carry it on after. */
export const SCHEDULE_DAYS_AHEAD = 14;

/** The first `SCHEDULE_DAYS_AHEAD` days of a schedule starting on `first`, on `weekdays`. */
export function firstScheduleDays(first: string, weekdays: readonly Weekday[]): string[] {
  return scheduleDays(first, addDays(first, SCHEDULE_DAYS_AHEAD - 1), weekdays);
}

/** The days from `from` through `to`, both included, that fall on one of `weekdays`. */
export function scheduleDays(from: string, to: string, weekdays: readonly Weekday[]): string[] {
  const days: string[] = [];
  const span = daysBetween(from, to);
  for (let offset = 0; offset <= span; offset++) {
    const day = addDays(from, offset);
    if (weekdays.includes(weekdayOf(day))) days.push(day);
  }
  return days;
}

/**
 * The session days the plan proposes for a number of sessions a week (3: Mon, Wed, Fri). With
 * `DEFAULT_SESSION_TIME` this is the schedule onboarding offers; the family can change both.
 */
export function proposedDays(sessionsPerWeek: number): Weekday[] {
  const days = PROPOSED_DAYS[sessionsPerWeek];
  if (!days) throw new RangeError(`No plan has ${sessionsPerWeek} sessions a week`);
  return [...days];
}

function sessionsPerWeek(pace: Pace): number {
  const count = "preset" in pace ? PRESET_SESSIONS[pace.preset] : pace.sessionsPerWeek;
  if (!Number.isInteger(count) || count < 1 || count > MAX_SESSIONS_PER_WEEK) {
    throw new RangeError(`Sessions a week must be 1 to ${MAX_SESSIONS_PER_WEEK}, got ${count}`);
  }
  return count;
}

/** The last day of week `week` (1-based) of a plan that starts on `start`. */
function weekEnd(start: string, week: number): string {
  return addDays(start, week * 7 - 1);
}

/**
 * The plan for finishing `totalSessions` by `target` at `pace`. Weeks run seven days from `start`,
 * and a unit is due at the end of the week its last session falls in. A plan slower than the
 * target needs still comes back, with `onTime` false; a target that needs more than
 * `MAX_SESSIONS_PER_WEEK` comes back as "target too soon".
 */
export function planPace({ totalSessions, units, start, target, pace }: PaceInput): PaceResult {
  if (!Number.isInteger(totalSessions) || totalSessions < 1) {
    throw new RangeError(`A course needs at least one session, got ${totalSessions}`);
  }
  const perWeek = sessionsPerWeek(pace);
  // Whole weeks from the start day through the target day.
  const weeksAvailable = Math.floor((daysBetween(start, target) + 1) / 7);
  const requiredPerWeek = weeksAvailable > 0 ? Math.ceil(totalSessions / weeksAvailable) : Infinity;
  if (requiredPerWeek > MAX_SESSIONS_PER_WEEK) {
    const fastest = Math.ceil(totalSessions / MAX_SESSIONS_PER_WEEK);
    return { ok: false, error: "target-too-soon", earliestTarget: weekEnd(start, fastest) };
  }

  const weeks = Math.ceil(totalSessions / perWeek);
  let sessionsSoFar = 0;
  const milestones = units.map(({ title, sessions }) => {
    sessionsSoFar += sessions;
    return { title, date: weekEnd(start, Math.ceil(sessionsSoFar / perWeek)) };
  });
  return {
    ok: true,
    plan: {
      sessionsPerWeek: perWeek,
      weeklyMinutes: perWeek * SESSION_MINUTES,
      weeks,
      finishDate: weekEnd(start, weeks),
      requiredPerWeek,
      onTime: perWeek >= requiredPerWeek,
      milestones,
    },
  };
}

/** "2 hours", "1.5 hours", "30 minutes". */
export function formatWeeklyTime(minutes: number): string {
  if (minutes < 60) return `${minutes} minutes`;
  const hours = minutes / 60;
  return `${hours} ${hours === 1 ? "hour" : "hours"}`;
}
