import Link from "next/link";
import { inSentence } from "@/content/title";
import { streakLabel, XP_LABELS } from "@/parent/progress";
import type { SessionSummary } from "@/session/complete";
import { EXIT_PASS_MARK } from "@/session/mastery";
import type { StreakChange } from "@/session/rewards";

interface SessionCompleteProps {
  title: string;
  /** Absent only for a session finished before verdicts were recorded. */
  summary?: SessionSummary;
}

const MUTED = "text-zinc-600 dark:text-zinc-400";

function streakChangeLine({ before, after, sessionDay, alreadyCounted }: StreakChange): string {
  const restored = after.untilFreeze === 0 && before.untilFreeze > 0;
  const freeze = restored ? " Your streak freeze is back." : "";
  if (!sessionDay) return "This was not a scheduled session day, so the streak stays the same.";
  if (alreadyCounted) return "A session already counted for this day.";
  return `Up from ${before.count}: done on its day.${freeze}`;
}

function Earned({ rewards }: Pick<SessionSummary, "rewards">) {
  const { xp, awards, streak, badges } = rewards;
  return (
    <section
      aria-labelledby="earned-heading"
      className="flex flex-col gap-4 rounded-lg border border-zinc-200 p-5 dark:border-zinc-800"
    >
      <h2 id="earned-heading" className={`text-sm font-medium tracking-wide uppercase ${MUTED}`}>
        This session
      </h2>
      <div className="flex flex-col gap-1">
        <p className="text-2xl font-semibold">+{xp} XP</p>
        {awards.length > 0 && (
          <ul className={`text-sm ${MUTED}`}>
            {awards.map((award) => (
              <li key={award.kind}>
                {XP_LABELS[award.kind]}: {award.amount} XP
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="flex flex-col gap-1">
        <p className="text-lg font-semibold">{streakLabel(streak.after.count)}</p>
        <p className={`text-sm ${MUTED}`}>{streakChangeLine(streak)}</p>
      </div>
      {badges.length > 0 && (
        <ul aria-label="Badges earned" className="flex flex-col gap-2">
          {badges.map((badge) => (
            <li key={badge.key} className="flex flex-col">
              <span className="font-semibold">{badge.label}</span>
              <span className={`text-sm ${MUTED}`}>{badge.detail}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function SessionComplete({ title, summary }: SessionCompleteProps) {
  const mastered = summary?.outcome === "mastered";
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold tracking-tight">
        {mastered ? "Mastered" : "Session done"}
      </h1>
      {summary === undefined ? (
        <p className={MUTED}>You finished {title}.</p>
      ) : mastered ? (
        <p className={MUTED}>
          You got {summary.exitCorrect} of {summary.exitTotal} on the exit check and passed your
          explain-back. You have mastered {inSentence(title)}.
        </p>
      ) : (
        <>
          <p className="text-lg font-semibold">This concept repeats next session.</p>
          <p className={MUTED}>
            You got {summary.exitCorrect} of {summary.exitTotal} on the exit check
            {summary.explainPassed ? "" : " and your explain-back did not pass"}. Mastery takes{" "}
            {EXIT_PASS_MARK} of {summary.exitTotal} and a passed explain-back.
          </p>
        </>
      )}
      {summary && <Earned rewards={summary.rewards} />}
      <Link href="/student" className="font-medium underline underline-offset-4">
        Back to today
      </Link>
    </div>
  );
}
