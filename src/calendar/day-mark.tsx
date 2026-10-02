import type { DayState } from "./month";
import { CheckGlyph, CrossGlyph } from "@/components/ui/glyphs";
import { WEEKDAY_LABELS, weekdayOf } from "@/engine/pace";
import { formatDay } from "@/parent/progress";

export const STATE_LABELS: Readonly<Record<DayState, string>> = {
  done: "Done",
  missed: "Missed",
  scheduled: "Scheduled",
};

/** A day's mark, the same on the week strip and the month: a green check, a red cross, a teal ring. */
export function DayMark({ state, className = "size-6" }: { state: DayState; className?: string }) {
  switch (state) {
    case "done":
      return (
        <span
          className={`grid place-items-center rounded-full bg-success-fill text-ink ${className}`}
        >
          <CheckGlyph className="size-3.5" />
        </span>
      );
    case "missed":
      return (
        <span
          className={`grid place-items-center rounded-full bg-alert-tint text-alert ${className}`}
        >
          <CrossGlyph className="size-3.5" />
        </span>
      );
    case "scheduled":
      return <span className={`rounded-full border-2 border-calendar ${className}`} />;
  }
}

interface DayCellProps {
  day: string;
  state: DayState | undefined;
  today: string;
  /** The weekday above the date, on the week strip. */
  weekday?: boolean;
  /** The cell's border when it is not today: the month draws one, the strip does not. */
  bordered?: boolean;
}

/**
 * One day on the week strip or the month: the date, its mark, and one line for a screen reader
 * ("Thu, Oct 1, today, scheduled"). Today sits on the today tint.
 */
export function DayCell({ day, state, today, weekday = false, bordered = false }: DayCellProps) {
  const isToday = day === today;
  const border = isToday
    ? "border-today bg-today-tint"
    : bordered
      ? "border-line"
      : "border-transparent";
  return (
    <li className={`flex flex-col items-center gap-1.5 rounded-md border py-2 ${border}`}>
      {weekday && (
        <span aria-hidden="true" className="text-xs font-medium text-ink-soft">
          {WEEKDAY_LABELS[weekdayOf(day)]}
        </span>
      )}
      <span
        aria-hidden="true"
        className={`font-display leading-none font-semibold tabular-nums ${weekday ? "text-lg" : "text-base"}`}
      >
        {Number(day.slice(8))}
      </span>
      {state ? <DayMark state={state} /> : <span aria-hidden="true" className="size-6" />}
      <span className="sr-only">
        {formatDay(day)}
        {isToday && ", today"}
        {state && `, ${STATE_LABELS[state].toLowerCase()}`}
      </span>
    </li>
  );
}

/** The marks explained, under a calendar. */
export function DayLegend() {
  return (
    <ul aria-label="Legend" className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-ink-soft">
      {(["done", "missed", "scheduled"] as const).map((state) => (
        <li key={state} className="flex items-center gap-2">
          <DayMark state={state} className="size-5" />
          {STATE_LABELS[state]}
        </li>
      ))}
      <li className="flex items-center gap-2">
        <span className="size-5 rounded-full border border-today bg-today-tint" />
        Today
      </li>
    </ul>
  );
}
