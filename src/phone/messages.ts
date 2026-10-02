import { timeLabel } from "@/parent/phone-rule";
import { weekdayName } from "@/parent/progress";
import type { LockView } from "@/session/lock-status";

/** What the phone says while it is open: the first condition that let it go, in the kid's words. */
export function openMessage({
  reason,
  rule,
  nextLockDay,
}: Pick<LockView, "reason" | "rule" | "nextLockDay">): string {
  switch (reason) {
    case "session-done":
      return "Today's session is done. Everything is open.";
    case "override":
      return "A parent unlocked this phone until midnight.";
    case "before-start":
      return `Apps lock at ${rule ? timeLabel(rule.startTime) : "the start time"} until today's session is done.`;
    case "not-session-day":
      return nextLockDay
        ? `Everything is open until ${weekdayName(nextLockDay)}, the next session day.`
        : "No session today. Everything is open.";
    case "weekend-off":
      return nextLockDay
        ? `It's the weekend. Everything is open until ${weekdayName(nextLockDay)}.`
        : "It's the weekend. Everything is open.";
    case "off":
      return "The phone rule is off.";
    default:
      return "No phone rule yet.";
  }
}
