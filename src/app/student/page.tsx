import type { Metadata } from "next";
import { connection } from "next/server";
import { ClassSelector } from "./class-selector";
import { CourseProgressTile, LevelTile, StreakTile } from "./stats";
import { StudentShell } from "./student-shell";
import { TodayCard } from "./today-card";
import { adminControls } from "@/admin/controls";
import { dayStates, weekOf } from "@/calendar/month";
import { WeekStrip } from "@/calendar/week-strip";
import { ALGEBRA1_COURSE, ALGEBRA1_TITLE } from "@/content/algebra1/course";
import { studentEarnings } from "@/db/queries/rewards";
import { findTodaySession } from "@/db/queries/sessions";
import { getStudent } from "@/db/queries/students";
import { conceptPlace, courseProgress, nextConcept } from "@/engine/course";
import { streak } from "@/engine/progress";
import { calendarDay, plannedSlots } from "@/parent/progress";
import { timeLabel } from "@/parent/phone-rule";
import { PhoneSection } from "@/phone/phone-section";
import { currentStudentId } from "@/session/current-student";
import { lockView } from "@/session/lock-status";
import { scheduleRecord } from "@/session/pace";

export const metadata: Metadata = { title: "Today · Klade" };

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
  // The plan and the finished sessions feed both the streak tile and this week's strip.
  const completedDays = record.completed.map(calendarDay);

  return (
    <StudentShell
      active="/student"
      student={student}
      mastered={earnings.mastered}
      controls={controls}
      notice={params.notice}
    >
      {(student) => (
        <>
          <ClassSelector />
          <header className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
            <h1 className="font-display text-4xl font-bold tracking-tight">Hi, {student.name}</h1>
            <p className="text-ink-soft">
              {ALGEBRA1_TITLE}: {progress.mastered} of {progress.total} concepts mastered
              {place ? `, on concept ${place.position}.` : "."}
            </p>
          </header>

          <div className={`grid gap-5 ${phone.rule ? "xl:grid-cols-[minmax(0,1fr)_292px]" : ""}`}>
            <div className="flex min-w-0 flex-col gap-5">
              <TodayCard
                today={todaySession}
                place={place}
                next={nextConcept(ALGEBRA1_COURSE, earnings.mastered)}
                phone={phone}
              />
              <div className="grid gap-4 sm:grid-cols-3">
                <CourseProgressTile progress={progress} />
                <LevelTile xp={earnings.xp} mastered={earnings.mastered} />
                <StreakTile streak={streak(record.schedule, completedDays, today)} />
              </div>
              <WeekStrip
                days={week}
                states={dayStates(
                  plannedSlots(record.schedule, student.sessionDays, week[6]),
                  completedDays,
                  today,
                  week[0],
                  week[6],
                )}
                today={today}
              />
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
      )}
    </StudentShell>
  );
}
