import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { startTodaySession } from "./actions";
import { BadgeShelf } from "./badge-shelf";
import { CourseProgressTile, LevelTile, StreakTile } from "./stats";
import { TodayCard } from "./today-card";
import { adminControls } from "@/admin/controls";
import { AdminRibbon } from "@/admin/ribbon";
import { ALGEBRA1_COURSE, ALGEBRA1_TITLE } from "@/content/algebra1/course";
import { rewardBoard } from "@/content/rewards";
import { CourseMap } from "@/course/course-map";
import { mentorFor } from "@/db/queries/mentor";
import { latestExplanation, sessionHistory } from "@/db/queries/parent";
import { rewardRows } from "@/db/queries/reward-progress";
import { studentEarnings } from "@/db/queries/rewards";
import { findTodaySession } from "@/db/queries/sessions";
import { getStudent } from "@/db/queries/students";
import { conceptPlace, courseProgress, nextConcept } from "@/engine/course";
import { MentorCard } from "@/mentor/mentor-card";
import { HistoryTable } from "@/parent/history-table";
import { timeLabel } from "@/parent/phone-rule";
import { PhoneSection } from "@/phone/phone-section";
import { RewardsPanel } from "@/rewards/rewards-panel";
import { currentStudentId } from "@/session/current-student";
import { lockView } from "@/session/lock-status";
import { studentStanding } from "@/session/pace";

export const metadata: Metadata = { title: "Today · Klade" };

/** Sessions and missed days the dashboard lists. */
const RECENT_SESSIONS = 8;

const SECTION = "card flex flex-col gap-4";
const MUTED = "text-zinc-600 dark:text-zinc-400";

export default async function StudentHome({ searchParams }: PageProps<"/student">) {
  // Reads the database, so it renders per request, never at build time.
  await connection();
  const studentId = await currentStudentId();
  const now = new Date();
  const [
    params,
    controls,
    student,
    today,
    standing,
    earnings,
    phone,
    rows,
    mentor,
    explanation,
    history,
  ] = await Promise.all([
    searchParams,
    adminControls(),
    getStudent(studentId),
    findTodaySession(studentId),
    studentStanding(studentId, now),
    studentEarnings(studentId),
    lockView(studentId, now),
    rewardRows(studentId),
    mentorFor(studentId),
    latestExplanation(studentId),
    sessionHistory(studentId, RECENT_SESSIONS),
  ]);
  const rewards = rewardBoard(rows, standing);
  const currentKey = today.kind === "complete" ? null : today.contentKey;
  const place = currentKey === null ? undefined : conceptPlace(ALGEBRA1_COURSE, currentKey);
  const progress = courseProgress(ALGEBRA1_COURSE, earnings.mastered);

  return (
    <div className="flex flex-col gap-6">
      <AdminRibbon controls={controls} back="/student" notice={params.notice} />
      {student ? (
        <>
          <header className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
            <h1 className="font-display text-4xl font-bold tracking-tight text-dusk dark:text-white">
              Hi, {student.name}
            </h1>
            <p className={MUTED}>
              {ALGEBRA1_TITLE}: {progress.mastered} of {progress.total} concepts mastered
              {place ? `, on concept ${place.position}.` : "."}
            </p>
          </header>

          <div className="grid gap-5 lg:grid-cols-12">
            <TodayCard
              today={today}
              place={place}
              next={nextConcept(ALGEBRA1_COURSE, earnings.mastered)}
              phone={phone}
              className="lg:col-span-7"
            />
            <div className="grid gap-4 sm:grid-cols-3 lg:col-span-5 lg:grid-cols-1">
              <CourseProgressTile progress={progress} />
              <LevelTile xp={earnings.xp} mastered={earnings.mastered} />
              <StreakTile streak={standing.streak} />
            </div>
          </div>

          <section aria-labelledby="map-heading" className={SECTION}>
            <div className="flex flex-col gap-1">
              <h2 id="map-heading" className="font-display text-2xl font-semibold">
                Course map
              </h2>
              <p className={MUTED}>
                {ALGEBRA1_TITLE} in the order the New York State standards teach it:{" "}
                {progress.units} units, {progress.total} concepts, each with its standard code. Only
                today&apos;s concept opens a session.
              </p>
            </div>
            <CourseMap
              units={ALGEBRA1_COURSE}
              mastered={earnings.mastered}
              currentKey={currentKey}
              today={currentKey === null ? undefined : startTodaySession}
            />
          </section>

          <div className="grid gap-5 lg:grid-cols-3">
            <BadgeShelf earned={earnings.badges} currentKey={currentKey} />
            {rewards.length > 0 && (
              <RewardsPanel
                entries={rewards}
                behind={standing.behind}
                viewer={{ kind: "student" }}
              />
            )}
            {mentor && (
              <MentorCard mentor={mentor} now={now} student={{ viewer: "student", explanation }} />
            )}
          </div>

          <div className="grid gap-5 lg:grid-cols-12">
            {phone.rule && (
              <div className="lg:col-span-5">
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
                  <p className={MUTED}>Prototype: this phone runs inside the app.</p>
                </PhoneSection>
              </div>
            )}
            <section
              aria-labelledby="recent-heading"
              className={`${SECTION} ${phone.rule ? "lg:col-span-7" : "lg:col-span-12"}`}
            >
              <h2 id="recent-heading" className="font-display text-xl font-semibold">
                Recent sessions
              </h2>
              <HistoryTable rows={history} />
            </section>
          </div>
        </>
      ) : (
        <p>
          No student yet.{" "}
          <Link href="/onboarding" className="underline">
            Set one up
          </Link>
          , or run npm run db:seed to add the demo student.
        </p>
      )}
    </div>
  );
}
