import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { ParentShell } from "./parent-shell";
import { Card } from "@/components/ui/card";
import { PanelHeader } from "@/components/ui/panel-header";
import { ALGEBRA1_COURSE, ALGEBRA1_TITLE } from "@/content/algebra1/course";
import { rewardBoard } from "@/content/rewards";
import { CourseMap } from "@/course/course-map";
import { masteryGrid, sessionHistory } from "@/db/queries/parent";
import { rewardRows } from "@/db/queries/reward-progress";
import { findTodaySession } from "@/db/queries/sessions";
import { getStudent } from "@/db/queries/students";
import { courseProgress } from "@/engine/course";
import { gatedFamily } from "@/gate/server";
import { HistoryTable } from "@/parent/history-table";
import { ruleSummary } from "@/parent/phone-rule";
import {
  formatDate,
  freezeLabel,
  plural,
  progressLine,
  sessionCount,
  streakLabel,
} from "@/parent/progress";
import { PhoneSection } from "@/phone/phone-section";
import { RewardsPanel } from "@/rewards/rewards-panel";
import { lockView } from "@/session/lock-status";
import { studentStanding } from "@/session/pace";

export const metadata: Metadata = { title: "Overview" };

type GridRow = Awaited<ReturnType<typeof masteryGrid>>[number];

/** What the map says under a concept the student has a status on: the score, or that it repeats. */
function masteryNote({ status, exitScore, exitTotal }: GridRow): string | undefined {
  const score = exitScore !== null && exitTotal !== null ? `${exitScore} of ${exitTotal}` : null;
  switch (status) {
    case "mastered":
      return score ? `${score} on the exit check` : undefined;
    case "repeat":
      return score ? `repeats, ${score} on the last exit check` : "repeats";
    case "in_progress":
      return "in progress";
    default:
      return undefined;
  }
}

export default async function ParentOverview() {
  // Reads the database, so it renders per request and shows a session the moment it ends.
  await connection();
  const { studentId } = await gatedFamily("/parent");
  const now = new Date();
  const [student, standing, history, grid, phone, rewardProgress, today] = await Promise.all([
    getStudent(studentId),
    studentStanding(studentId, now),
    sessionHistory(studentId),
    masteryGrid(studentId),
    lockView(studentId, now),
    rewardRows(studentId),
    findTodaySession(studentId),
  ]);

  return (
    <ParentShell active="/parent" student={student}>
      {(student) => {
        const { name } = student;
        const { behind, streak } = standing;
        const { rule } = phone;
        const rewards = rewardBoard(rewardProgress, standing);
        // The map's inputs from the grid: the concepts mastered, and a note on each with a status.
        const mastered = new Set<string>();
        const notes = new Map<string, string>();
        for (const concept of grid) {
          if (concept.status === "mastered") mastered.add(concept.contentKey);
          const note = masteryNote(concept);
          if (note) notes.set(concept.contentKey, note);
        }
        const progress = courseProgress(ALGEBRA1_COURSE, mastered);
        return (
          <>
            <header className="flex flex-col gap-2">
              <h1 className="font-display text-3xl font-bold tracking-tight">Overview</h1>
              <p className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                <span className="font-display text-2xl font-semibold text-primary-deep">
                  {progressLine(behind, student.targetDate)}
                </span>
                <span className="text-lg font-semibold">{streakLabel(streak.count)}</span>
                <span className="text-ink-soft">{freezeLabel(streak)}</span>
              </p>
              <p className="text-ink-soft">
                {name}&apos;s progress in {ALGEBRA1_TITLE}. Target {formatDate(student.targetDate)},{" "}
                {sessionCount(student.pacePerWeek)} a week.
              </p>
            </header>

            <PhoneSection
              heading={`${name}'s phone`}
              viewer="parent"
              initial={phone}
              sessionHref="/student"
            >
              <p>
                {rule
                  ? `${ruleSummary(rule, name)}${rule.enabled ? "" : " The rule is off right now."}`
                  : `No phone rule yet. Set one and ${name}'s apps lock on session days until the session is done.`}
              </p>
              <p className="text-ink-soft">
                Prototype: this phone runs inside the app. It shows what {name} would see, and
                unlocks the moment the session is done.
              </p>
              <p>
                <Link href="/parent/settings" className="link">
                  {rule ? "Change the phone rule" : "Set a phone rule"}
                </Link>
              </p>
            </PhoneSection>

            {rewards.length > 0 && (
              <RewardsPanel
                entries={rewards}
                behind={behind}
                viewer={{ kind: "parent", name, targetDate: student.targetDate }}
              />
            )}

            <Card aria-labelledby="map-heading" className="flex flex-col gap-5">
              <PanelHeader id="map-heading" title="Course map" size="lg">
                <p>
                  {name} has mastered {progress.mastered} of {progress.total} concepts in{" "}
                  {ALGEBRA1_TITLE}, {progress.unitsDone} of {plural(progress.units, "unit")} done.
                  Each concept carries its New York State standard code, so you can match it to the
                  school&apos;s syllabus.
                </p>
              </PanelHeader>
              <CourseMap
                units={ALGEBRA1_COURSE}
                mastered={mastered}
                currentKey={today.kind === "complete" ? null : today.contentKey}
                notes={notes}
                unitHeading="h3"
              />
            </Card>

            <Card aria-labelledby="history-heading" className="flex flex-col gap-4">
              <PanelHeader id="history-heading" title="Session history" size="lg" />
              <HistoryTable rows={history} />
            </Card>
          </>
        );
      }}
    </ParentShell>
  );
}
