import type { Metadata } from "next";
import { connection } from "next/server";
import { CourseProgressStat, LevelStat, StatStrip, StreakStat } from "./stats";
import { StudentShell } from "./student-shell";
import { TodayCard } from "./today-card";
import { adminControls } from "@/admin/controls";
import { dayStates, nextSessionDay, weekOf, type DayState } from "@/calendar/month";
import { WeekStrip } from "@/calendar/week-strip";
import { PageHeader } from "@/components/ui/page-header";
import { ALGEBRA1_COURSE, ALGEBRA1_TITLE } from "@/content/algebra1/course";
import { studentEarnings } from "@/db/queries/rewards";
import { findTodaySession } from "@/db/queries/sessions";
import { getStudent } from "@/db/queries/students";
import { conceptPlace, courseProgress, nextConcept } from "@/engine/course";
import { addDays, SCHEDULE_DAYS_AHEAD } from "@/engine/pace";
import { streak } from "@/engine/progress";
import { timeLabel } from "@/parent/phone-rule";
import { calendarDay, formatDay, plannedSlots } from "@/parent/progress";
import { PhoneSection } from "@/phone/phone-section";
import { currentStudentId } from "@/session/current-student";
import { lockView } from "@/session/lock-status";
import { scheduleRecord } from "@/session/pace";

export const metadata: Metadata = { title: "Today" };

/**
 * When the session is due, from the plan: today at the session time while today is a plan day
 * not yet done (missed counts, since a session now still closes the gap), else the next planned
 * day.
 */
function dueLine(states: ReadonlyMap<string, DayState>, today: string, sessionTime: string) {
  const at = timeLabel(sessionTime);
  const todayState = states.get(today);
  if (todayState === "scheduled" || todayState === "missed") return `Due today, ${at}`;
  const next = nextSessionDay(states, today);
  if (next) return `Next session day ${formatDay(next)}, ${at}`;
  return "No session day in the next two weeks";
}

export default async function StudentHome({ searchParams }: PageProps<"/student">) {
  // Reads the database, so it renders per request, never at build time.
  await connection();
  const studentId = await currentStudentId();
  const now = new Date();
  const today = calendarDay(now);
  const week = weekOf(today);
  const [params, controls, student, todaySession, record, earnings, phone] = await Promise.all([
    searchParams,
    adminControls(),
    getStudent(studentId),
    findTodaySession(studentId),
    scheduleRecord(studentId, today),
    studentEarnings(studentId),
    lockView(studentId, now),
  ]);
  const currentKey = todaySession.kind === "complete" ? null : todaySession.contentKey;
  const place = currentKey === null ? undefined : conceptPlace(ALGEBRA1_COURSE, currentKey);
  const progress = courseProgress(ALGEBRA1_COURSE, earnings.mastered);
  // The plan and the finished sessions feed the due line, the streak and this week's strip.
  const completedDays = record.completed.map(calendarDay);
  const current = streak(record.schedule, completedDays, today);

  return (
    <StudentShell
      active="/student"
      student={student}
      standing={{ xp: earnings.xp, mastered: earnings.mastered, streak: current.count }}
      controls={controls}
      notice={params.notice}
    >
      {(student) => {
        // One reading of the plan, from this week's Monday through the fortnight ahead: the
        // strip takes its seven days from it and the due line takes the next planned day.
        const ahead = addDays(today, SCHEDULE_DAYS_AHEAD);
        const states = dayStates(
          plannedSlots(record.schedule, student.sessionDays, ahead),
          completedDays,
          today,
          week[0],
          ahead,
        );
        return (
          <>
            <PageHeader title="Today">
              <p>
                Hi, {student.name}. {ALGEBRA1_TITLE}: {progress.mastered} of {progress.total}{" "}
                concepts mastered{place ? `, on concept ${place.position}.` : "."}
              </p>
            </PageHeader>

            <div className={`grid gap-5 ${phone.rule ? "xl:grid-cols-[minmax(0,1fr)_292px]" : ""}`}>
              <div className="flex min-w-0 flex-col gap-5">
                <TodayCard
                  today={todaySession}
                  place={place}
                  next={nextConcept(ALGEBRA1_COURSE, earnings.mastered)}
                  due={
                    todaySession.kind === "complete"
                      ? undefined
                      : dueLine(states, today, student.sessionTime)
                  }
                  phone={phone}
                />
                <StatStrip label="Your standing">
                  <CourseProgressStat progress={progress} />
                  <LevelStat xp={earnings.xp} mastered={earnings.mastered} />
                  <StreakStat streak={current} />
                </StatStrip>
                <WeekStrip days={week} states={states} today={today} />
              </div>
              {phone.rule && (
                <PhoneSection
                  heading="Your phone"
                  viewer="student"
                  initial={phone}
                  sessionHref="#today"
                >
                  <p>
                    On session days your apps lock at {timeLabel(phone.rule.startTime)} until
                    today&apos;s session is done. Finish it and they open right away.
                  </p>
                  <p className="text-ink-soft">Prototype: this phone runs inside the app.</p>
                </PhoneSection>
              )}
            </div>
          </>
        );
      }}
    </StudentShell>
  );
}
