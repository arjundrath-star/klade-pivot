/** The phone rule in words, for the parent's settings, the parent view and the admin panel. */
import { WEEKDAY_LABELS, WEEKDAYS } from "@/engine/pace";
import {
  LOCK_CATEGORIES,
  LOCK_CATEGORY_LABELS,
  WEEKEND,
  type LockRuleFields,
} from "@/session/lock";

const list = new Intl.ListFormat("en-US", { style: "long", type: "conjunction" });

/** "5:00 PM" for the 24-hour "17:00". */
export function timeLabel(time: string): string {
  const [hours, minutes] = time.split(":").map(Number);
  const suffix = hours < 12 ? "AM" : "PM";
  return `${hours % 12 || 12}:${String(minutes).padStart(2, "0")} ${suffix}`;
}

/**
 * The rule in one sentence: "On Mon, Tue, Thu, and Sun, games and social lock at 5:00 PM until
 * Maya's session is done."
 */
export function ruleSummary(rule: LockRuleFields, name: string): string {
  const days = WEEKDAYS.filter((day) => rule.days.includes(day));
  const when =
    days.length === WEEKDAYS.length
      ? "Every day"
      : `On ${list.format(days.map((day) => WEEKDAY_LABELS[day]))}`;
  const apps = list.format(
    LOCK_CATEGORIES.filter((c) => rule.categories.includes(c)).map((c) =>
      LOCK_CATEGORY_LABELS[c].toLowerCase(),
    ),
  );
  const weekend =
    rule.weekendOff && days.some((day) => WEEKEND.includes(day))
      ? " Weekends stay open."
      : "";
  return `${when}, ${apps} lock at ${timeLabel(rule.startTime)} until ${name}'s session is done.${weekend}`;
}
