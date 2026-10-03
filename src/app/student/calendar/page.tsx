import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { z } from "zod";
import { StudentShell } from "../student-shell";
import { adminControls } from "@/admin/controls";
import { DayLegend } from "@/calendar/day-mark";
import {
  dayStates,
  MONTH_PATTERN,
  monthEnd,
  monthLabel,
  monthOf,
  monthStart,
  nextSessionDay,
  shiftMonth,
} from "@/calendar/month";
import { MonthView } from "@/calendar/month-view";
import { buttonClass } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { masteredConcepts, studentXp } from "@/db/queries/rewards";
import { addDays, SCHEDULE_DAYS_AHEAD, SESSION_MINUTES } from "@/engine/pace";
import { streak } from "@/engine/progress";
import { timeLabel } from "@/parent/phone-rule";
import { calendarDay, formatDay, plannedSlots, sessionCount } from "@/parent/progress";
import { studentOnPage } from "@/session/current-student";
import { scheduleRecord } from "@/session/pace";

export const metadata: Metadata = { title: "Calendar" };

/** How far from the current month the view goes; anything further falls back to this month. */
const MONTHS_AROUND = 24;

const Params = z.object({ month: z.string().regex(MONTH_PATTERN).optional().catch(undefined) });

/** The month to show: the one asked for, within range, else the current one. */
function monthToShow(asked: string | undefined, current: string): string {
  if (
    asked === undefined ||
    asked < shiftMonth(current, -MONTHS_AROUND) ||
    asked > shiftMonth(current, MONTHS_AROUND)
  ) {
    return current;
  }
  return asked;
}

export default async function CalendarPage({ searchParams }: PageProps<"/student/calendar">) {
  await connection();
  const { id: studentId, student } = await studentOnPage("/student/calendar");
  const today = calendarDay(new Date());
  const params = Params.parse(await searchParams);
  const month = monthToShow(params.month, monthOf(today));
  const [controls, xp, mastered, record] = await Promise.all([
    adminControls(),
    studentXp(studentId),
    masteredConcepts(studentId),
    scheduleRecord(studentId, today),
  ]);
  const completedDays = record.completed.map(calendarDay);

  return (
    <StudentShell
      active="/student/calendar"
      student={student}
      standing={{
        xp,
        mastered,
        streak: streak(record.schedule, completedDays, today).count,
      }}
      controls={controls}
    >
      {(student) => {
        // The plan carried on to `to`, read for the month on screen and for the fortnight ahead.
        const states = (from: string, to: string) =>
          dayStates(
            plannedSlots(record.schedule, student.sessionDays, to),
            completedDays,
            today,
            from,
            to,
          );
        const next = nextSessionDay(states(today, addDays(today, SCHEDULE_DAYS_AHEAD)), today);
        return (
          <>
            <PageHeader title="Calendar">
              <p>
                {sessionCount(student.pacePerWeek)} a week, {SESSION_MINUTES} minutes each, at{" "}
                {timeLabel(student.sessionTime)}.
              </p>
            </PageHeader>
            <Card
              aria-labelledby="next-heading"
              tone="calendar"
              padding="sm"
              className="flex flex-col gap-1"
            >
              <h2 id="next-heading" className="text-sm font-semibold text-calendar-deep">
                Next session
              </h2>
              <p className="font-display text-2xl leading-tight font-semibold">
                {next
                  ? `${next === today ? "Today" : formatDay(next)}, ${timeLabel(student.sessionTime)}`
                  : "Nothing scheduled in the next two weeks."}
              </p>
            </Card>
            <Card aria-labelledby="month-heading" className="flex flex-col gap-5">
              <nav aria-label="Month" className="flex items-center justify-between gap-4">
                <Link
                  href={{ pathname: "/student/calendar", query: { month: shiftMonth(month, -1) } }}
                  className={buttonClass("secondary", "sm")}
                >
                  Previous
                </Link>
                <h2
                  id="month-heading"
                  className="font-display text-2xl font-semibold tracking-tight"
                >
                  {monthLabel(month)}
                </h2>
                <Link
                  href={{ pathname: "/student/calendar", query: { month: shiftMonth(month, 1) } }}
                  className={buttonClass("secondary", "sm")}
                >
                  Next
                </Link>
              </nav>
              <MonthView
                month={month}
                states={states(monthStart(month), monthEnd(month))}
                today={today}
              />
              <DayLegend />
            </Card>
          </>
        );
      }}
    </StudentShell>
  );
}
