/**
 * The phone lock (steering §3.1): on the rule's days, from its start time until the day's session
 * is done, the chosen app categories are locked. Pure: the route reads the inputs, this decides.
 */
import { addDays, scheduleDays, weekdayOf, type Weekday } from "@/engine/pace";
import { calendarDay, clockTime } from "@/parent/progress";

/** Where the phone panel sits: the parent view (the demo family) or the student's own view. */
export const LOCK_VIEWERS = ["parent", "student"] as const;

export type LockViewer = (typeof LOCK_VIEWERS)[number];

export const LOCK_CATEGORIES = ["social", "games", "video", "streaming"] as const;

export type LockCategory = (typeof LOCK_CATEGORIES)[number];

export const LOCK_CATEGORY_LABELS: Readonly<Record<LockCategory, string>> = {
  social: "Social",
  games: "Games",
  video: "Video",
  streaming: "Streaming",
};

export const WEEKEND: readonly Weekday[] = ["sat", "sun"];

/** The parts of the rule the parent edits, in onboarding and on /parent/settings. */
export interface LockRuleFields {
  days: Weekday[];
  /** 24-hour "HH:MM" in the family's time zone. */
  startTime: string;
  categories: LockCategory[];
  /** Saturdays and Sundays never lock, whatever `days` says. */
  weekendOff: boolean;
}

export interface LockRule extends LockRuleFields {
  enabled: boolean;
  /** The parent's "Unlock tonight": nothing locks before this moment. */
  overrideUntil: Date | null;
}

/** The plan a rule's defaults come from: the student's session days and start time. */
interface Plan {
  sessionDays: readonly Weekday[];
  sessionTime: string;
}

/** A new rule before the parent edits it: the plan's days and start time, games and social. */
export function defaultRule(plan: Plan): LockRuleFields {
  return {
    days: [...plan.sessionDays],
    startTime: plan.sessionTime,
    categories: ["games", "social"],
    weekendOff: false,
  };
}

/** Whether a session was finished on the family's calendar day. */
export type TodaySessionStatus = "done" | "not-done";

export type UnlockReason =
  | "no-rule"
  | "off"
  | "weekend-off"
  | "not-session-day"
  | "before-start"
  | "session-done"
  | "override";

export type LockState =
  { locked: true; reason: "session-due" } | { locked: false; reason: UnlockReason };

/** Tonight's unlock is running at `now` (real time: it ends at the family's real midnight). */
export function overrideActive(rule: Pick<LockRule, "overrideUntil">, now: Date): boolean {
  return rule.overrideUntil !== null && now.getTime() < rule.overrideUntil.getTime();
}

/**
 * Locked when the rule is on, `clock` falls on one of its days (not a weekend day with weekend
 * off), the family's clock is at or past the start time, today's session is not done, and no
 * override is running at `now`. Otherwise unlocked, with the first condition that let the phone
 * go. `clock` is what the rule reads, the demo clock when one is set; `now` is the real time,
 * which tonight's unlock runs out against.
 */
export function lockState(
  rule: LockRule | null,
  clock: Date,
  today: TodaySessionStatus,
  now = clock,
): LockState {
  if (!rule) return { locked: false, reason: "no-rule" };
  if (!rule.enabled) return { locked: false, reason: "off" };
  const weekday = weekdayOf(calendarDay(clock));
  if (rule.weekendOff && WEEKEND.includes(weekday)) return { locked: false, reason: "weekend-off" };
  if (!rule.days.includes(weekday)) return { locked: false, reason: "not-session-day" };
  if (clockTime(clock) < rule.startTime) return { locked: false, reason: "before-start" };
  if (today === "done") return { locked: false, reason: "session-done" };
  if (overrideActive(rule, now)) return { locked: false, reason: "override" };
  return { locked: true, reason: "session-due" };
}

function latestLockDay(
  today: string,
  days: readonly Weekday[],
  weekendOff: boolean,
): string | null {
  const locking = weekendOff ? days.filter((day) => !WEEKEND.includes(day)) : days;
  return scheduleDays(addDays(today, -6), today, locking).at(-1) ?? null;
}

/** Five minutes after the rule's start time, kept on the same day: the demo clock's hour. */
function demoClockTime(startTime: string): string {
  const [hours, minutes] = startTime.split(":").map(Number);
  const total = Math.min(hours * 60 + minutes + 5, 23 * 60 + 59);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

/**
 * The demo clock for a student: the latest day on or before `today` the rule locks on (else
 * today), five minutes after the rule starts. Without a rule, the default rule's.
 */
export function demoClockFor(
  rule: LockRuleFields | null,
  plan: Plan,
  today: string,
): { day: string; time: string } {
  const { days, startTime, weekendOff } = rule ?? defaultRule(plan);
  return {
    day: latestLockDay(today, days, weekendOff) ?? today,
    time: demoClockTime(startTime),
  };
}
