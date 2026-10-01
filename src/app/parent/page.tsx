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
import { rewardBoard } from "@/content/rewards";
import { sessionContent } from "@/content/sessions";
import { DEMO_FAMILY_ID, DEMO_STUDENT_ID } from "@/db/demo";
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
import { getStudent } from "@/db/queries/students";
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
import type { MasteryStatus } from "@/session/mastery";
import { studentStanding } from "@/session/pace";

export const metadata: Metadata = { title: "Parent view · Klade" };

const SECTION = "flex flex-col gap-4 rounded-lg border border-zinc-200 p-6 dark:border-zinc-800";
const HEADING = "text-sm font-medium tracking-wide text-zinc-600 uppercase dark:text-zinc-400";
const MUTED = "text-zinc-600 dark:text-zinc-400";

const MASTERY_LABELS: Readonly<Record<MasteryStatus, string>> = {
  mastered: "Mastered",
  in_progress: "In progress",
  repeat: "Repeat",
};

type HistoryRow = Awaited<ReturnType<typeof sessionHistory>>[number];

function historyDay(row: HistoryRow): string {
  if (row.scheduledFor !== null) return row.scheduledFor;
  const at = row.completedAt ?? row.startedAt;
  return at ? calendarDay(at) : "";
}

function historyResult(row: HistoryRow): string {
  if (row.status === "missed") return "Missed";
  if (row.status === "in_progress") return "In progress";
  return row.outcome === "repeat" ? "Repeat" : "Done";
}

function minutes(row: HistoryRow): number {
  const ms = Object.values(row.blockElapsedMs).reduce((sum, value) => sum + (value ?? 0), 0);
  return Math.round(ms / 60_000);
}

function rubricLine(verdict: "pass" | "fail", scores: RubricScores): string {
  const parts = CRITERIA.map((c) => `${CRITERION_LABELS[c].toLowerCase()} ${scores[c]}`);
  const total = `${totalScore(scores)} of ${MAX_TOTAL_SCORE}`;
  return `${verdict === "pass" ? "Passed" : "Did not pass"} the rubric, ${total}: ${parts.join(", ")}.`;
}

/** The latest decided explanation and the coach conversation from the same session. */
async function latestWithTranscript() {
  const explanation = await latestExplanation(DEMO_STUDENT_ID);
  const transcript = explanation ? await coachTurnsFor(explanation.sessionLogId) : [];
  return { explanation, transcript };
}

export default async function ParentView() {
  // Reads the database, so it renders per request and shows a session the moment it ends.
  await connection();
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
  ] = await Promise.all([
    getStudent(DEMO_STUDENT_ID),
    studentStanding(DEMO_STUDENT_ID, now),
    sessionHistory(DEMO_STUDENT_ID),
    masteryGrid(DEMO_STUDENT_ID),
    latestWithTranscript(),
    explainIntegrity(DEMO_STUDENT_ID),
    familyAlerts(DEMO_FAMILY_ID),
    lockView(DEMO_STUDENT_ID, now),
    rewardRows(DEMO_STUDENT_ID),
    mentorFor(DEMO_STUDENT_ID),
  ]);

  if (!student) return <p>No student yet. Run npm run db:seed to add the demo student.</p>;
  const { name } = student;
  const { behind, streak } = standing;
  const { rule } = phone;
  const rewards = rewardBoard(rewardProgress, standing);
  const rows = history
    .map((row) => ({ row, day: historyDay(row) }))
    .sort((a, b) => b.day.localeCompare(a.day));

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

      <section aria-labelledby="mastery-heading" className={SECTION}>
        <h2 id="mastery-heading" className={HEADING}>
          Mastery
        </h2>
        <table className="w-full text-left">
          <thead>
            <tr className={`text-sm ${MUTED}`}>
              <th scope="col" className="pb-2 font-medium">
                Concept
              </th>
              <th scope="col" className="pb-2 font-medium">
                Status
              </th>
              <th scope="col" className="pb-2 font-medium">
                Exit check
              </th>
            </tr>
          </thead>
          <tbody>
            {grid.map((concept) => (
              <tr key={concept.id} className="border-t border-zinc-200 dark:border-zinc-800">
                <th scope="row" className="py-2 font-normal">
                  {concept.title}
                </th>
                <td className="py-2">
                  {concept.status ? MASTERY_LABELS[concept.status] : "Not started"}
                </td>
                <td className="py-2">
                  {concept.exitScore === null
                    ? ""
                    : `${concept.exitScore} of ${sessionContent(concept.contentKey).exit.length}`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section aria-labelledby="history-heading" className={SECTION}>
        <h2 id="history-heading" className={HEADING}>
          Session history
        </h2>
        {rows.length === 0 ? (
          <p className={MUTED}>No sessions yet.</p>
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr className={`text-sm ${MUTED}`}>
                <th scope="col" className="pb-2 font-medium">
                  Date
                </th>
                <th scope="col" className="pb-2 font-medium">
                  Session
                </th>
                <th scope="col" className="pb-2 font-medium">
                  Result
                </th>
                <th scope="col" className="pb-2 text-right font-medium">
                  Minutes
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ row, day }) => (
                <tr key={row.id} className="border-t border-zinc-200 dark:border-zinc-800">
                  <td className="py-2">{day ? formatDay(day) : ""}</td>
                  <td className="py-2">{row.title}</td>
                  <td className="py-2">{historyResult(row)}</td>
                  <td className="py-2 text-right font-mono">{minutes(row)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
