import { DayCell } from "./day-mark";
import { monthGrid, type DayState } from "./month";
import { WEEKDAY_LABELS, WEEKDAYS } from "@/engine/pace";

interface MonthViewProps {
  /** YYYY-MM */
  month: string;
  states: ReadonlyMap<string, DayState>;
  today: string;
}

/** One month, Monday first, each day with its mark. Server-rendered; no calendar library. */
export function MonthView({ month, states, today }: MonthViewProps) {
  return (
    <div className="flex flex-col gap-2">
      <ol
        aria-hidden="true"
        className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-ink-soft"
      >
        {WEEKDAYS.map((weekday) => (
          <li key={weekday}>{WEEKDAY_LABELS[weekday]}</li>
        ))}
      </ol>
      <ol className="grid grid-cols-7 gap-1 sm:gap-1.5 [&>li]:min-h-16 sm:[&>li]:min-h-20">
        {monthGrid(month).map((day, index) =>
          day === null ? (
            <li key={`blank-${index}`} aria-hidden="true" />
          ) : (
            <DayCell key={day} day={day} state={states.get(day)} today={today} bordered />
          ),
        )}
      </ol>
    </div>
  );
}
