import Link from "next/link";
import { DayCell } from "./day-mark";
import type { DayState } from "./month";
import { Card } from "@/components/ui/card";
import { PanelHeader } from "@/components/ui/panel-header";

interface WeekStripProps {
  /** Monday through Sunday. */
  days: readonly string[];
  states: ReadonlyMap<string, DayState>;
  today: string;
}

/** This week's session days at a glance: done, missed, scheduled, and today. */
export function WeekStrip({ days, states, today }: WeekStripProps) {
  return (
    <Card aria-labelledby="week-heading" className="flex flex-col gap-4">
      <PanelHeader
        id="week-heading"
        title="This week"
        aside={
          <Link href="/student/calendar" className="link text-sm">
            Calendar
          </Link>
        }
      />
      <ol className="grid grid-cols-7 gap-1.5 sm:gap-2">
        {days.map((day) => (
          <DayCell key={day} day={day} state={states.get(day)} today={today} weekday />
        ))}
      </ol>
    </Card>
  );
}
