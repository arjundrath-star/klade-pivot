import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import {
  CRITERIA,
  CRITERION_LABELS,
  MAX_TOTAL_SCORE,
  totalScore,
  type RubricScores,
} from "@/coach/rubric";
import { ALGEBRA1_COURSE, ALGEBRA1_TITLE } from "@/content/algebra1/course";
import { rewardBoard } from "@/content/rewards";
import { CourseMap } from "@/course/course-map";
import { familyAlerts } from "@/db/queries/alerts";
import { coachTurnsFor } from "@/db/queries/coach";
import { mentorFor } from "@/db/queries/mentor";
import {
  explainIntegrity,
  latestExplanation,
  masteryGrid,
  sessionHistory,
} from "@/db/queries/parent";
import { rewardRows } from "@/db/queries/reward-progress";
import { findTodaySession } from "@/db/queries/sessions";
import { gatedFamily } from "@/gate/server";
import { getStudent } from "@/db/queries/students";
import { courseProgress } from "@/engine/course";
import { HistoryTable } from "@/parent/history-table";
import {
  calendarDay,
  formatDate,
  formatDay,
  freezeLabel,
  plural,
  progressLine,
  sessionCount,
  streakLabel,
} from "@/parent/progress";
import { ruleSummary } from "@/parent/phone-rule";
import { MentorCard } from "@/mentor/mentor-card";
import { PhoneSection } from "@/phone/phone-section";
import { RewardsPanel } from "@/rewards/rewards-panel";
import { lockView } from "@/session/lock-status";
import { studentStanding } from "@/session/pace";

export const metadata: Metadata = { title: "Parent view · Klade" };

const SECTION = "flex flex-col gap-4 rounded-lg border border-zinc-200 p-6 dark:border-zinc-800";
const HEADING = "text-sm font-medium tracking-wide text-zinc-600 uppercase dark:text-zinc-400";
const MUTED = "text-zinc-600 dark:text-zinc-400";

function rubricLine(verdict: "pass" | "fail", scores: RubricScores): string {
  const parts = CRITERIA.map((c) => `${CRITERION_LABELS[c].toLowerCase()} ${scores[c]}`);
  const total = `${totalScore(scores)} of ${MAX_TOTAL_SCORE}`;
  return `${verdict === "pass" ? "Passed" : "Did not pass"} the rubric, ${total}: ${parts.join(", ")}.`;
}

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

/** The latest decided explanation and the coach conversation from the same session. */
async function latestWithTranscript(studentId: string) {
  const explanation = await latestExplanation(studentId);
  const transcript = explanation ? await coachTurnsFor(explanation.sessionLogId) : [];
  return { explanation, transcript };
}

export default async function ParentView() {
  // Reads the database, so it renders per request and shows a session the moment it ends.
  await connection();
  const { familyId, studentId } = await gatedFamily("/parent");
  const now = new Date();
  const [
    student,
    standing,
    history,
    grid,
    { explanation, transcript },
    integrity,
    alerts,
    phone,
    rewardProgress,
    mentor,
    today,
  ] = await Promise.all([
    getStudent(studentId),
    studentStanding(studentId, now),
    sessionHistory(studentId),
    masteryGrid(studentId),
    latestWithTranscript(studentId),
    explainIntegrity(studentId),
    familyAlerts(familyId),
    lockView(studentId, now),
    rewardRows(studentId),
    mentorFor(studentId),
    findTodaySession(studentId),
  ]);

  if (!student) return <p>No student yet. Run npm run db:seed to add the demo student.</p>;
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
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">{name}&apos;s progress</h1>
        <p className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <span className="text-2xl font-semibold">{progressLine(behind, student.targetDate)}</span>
          <span className="text-lg font-semibold">{streakLabel(streak.count)}</span>
          <span className={MUTED}>{freezeLabel(streak)}</span>
        </p>
        <p className={MUTED}>
          Target: {formatDate(student.targetDate)}. {sessionCount(student.pacePerWeek)} a week.
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
        <p className={MUTED}>
          Prototype: this phone runs inside the app. It shows what {name} would see, and unlocks the
          moment the session is done.
        </p>
        <p>
          <Link href="/parent/settings" className="underline underline-offset-2">
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
      {mentor && <MentorCard mentor={mentor} now={now} student={{ viewer: "parent", name }} />}

      <section aria-labelledby="alerts-heading" className={SECTION}>
        <h2 id="alerts-heading" className={HEADING}>
          Notifications
        </h2>
        {alerts.length === 0 ? (
          <p className={MUTED}>No notifications yet.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {alerts.map((alert) => (
              <li key={alert.id} className="flex flex-col gap-1">
                <p>{alert.message}</p>
                <p className={`text-sm ${MUTED}`}>
                  {formatDay(calendarDay(alert.createdAt))} ·{" "}
                  <Link
                    href={`/parent/alerts/${alert.id}/preview`}
                    className="underline underline-offset-2"
                  >
                    Email preview
                  </Link>
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="explain-heading" className={SECTION}>
        <h2 id="explain-heading" className={HEADING}>
          What {name} can explain
        </h2>
        {explanation ? (
          <>
            <p className="font-medium">{explanation.concept}</p>
            {explanation.source === "override" ? (
              <p className="flex flex-wrap items-center gap-2">
                <span className="rounded bg-amber-100 px-2 py-0.5 text-sm font-medium text-amber-900 dark:bg-amber-900 dark:text-amber-100">
                  override
                </span>
                No explanation was graded in this session. An admin passed explain-back by hand.
              </p>
            ) : (
              <>
                <blockquote className="border-l-4 border-zinc-300 pl-4 leading-relaxed whitespace-pre-line dark:border-zinc-700">
                  {explanation.text}
                </blockquote>
                <p className="font-medium">{rubricLine(explanation.verdict, explanation)}</p>
                <p className={MUTED}>
                  Feedback {name} saw: {explanation.feedback}
                </p>
              </>
            )}
            <details className="flex flex-col gap-2">
              <summary className="cursor-pointer font-medium">
                Coach conversation in this session ({plural(transcript.length, "hint")})
              </summary>
              {transcript.length === 0 ? (
                <p className={`mt-2 ${MUTED}`}>{name} did not ask the coach for help.</p>
              ) : (
                <ol className="mt-2 flex flex-col gap-3">
                  {transcript.map((turn) => (
                    <li key={turn.id} className="flex flex-col gap-1">
                      <p className={`text-sm ${MUTED}`}>
                        Problem {turn.problemIndex + 1}, hint {turn.level}
                      </p>
                      <p>
                        <span className="font-medium">{name}:</span> {turn.studentText}
                      </p>
                      <p>
                        <span className="font-medium">Coach:</span> {turn.coachText}
                      </p>
                    </li>
                  ))}
                </ol>
              )}
            </details>
          </>
        ) : (
          <p className={MUTED}>
            Nothing yet. {name}&apos;s explanation shows here after the first finished session.
          </p>
        )}
        {integrity.graded > 0 && (
          <p className={`text-sm ${MUTED}`}>
            Across {plural(integrity.graded, "graded explanation")}: {integrity.pasted} with pasted
            text, {integrity.fast} typed faster than a person types.
          </p>
        )}
      </section>

      <section aria-labelledby="map-heading" className={SECTION}>
        <h2 id="map-heading" className={HEADING}>
          Course map
        </h2>
        <p>
          {name} has mastered {progress.mastered} of {progress.total} concepts in {ALGEBRA1_TITLE},{" "}
          {progress.unitsDone} of {plural(progress.units, "unit")} done. Each concept carries its
          New York State standard code, so you can match it to the school&apos;s syllabus.
        </p>
        <CourseMap
          units={ALGEBRA1_COURSE}
          mastered={mastered}
          currentKey={today.kind === "complete" ? null : today.contentKey}
          notes={notes}
          condensed
        />
      </section>

      <section aria-labelledby="history-heading" className={SECTION}>
        <h2 id="history-heading" className={HEADING}>
          Session history
        </h2>
        <HistoryTable rows={history} />
      </section>
    </div>
  );
}
