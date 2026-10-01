import Link from "next/link";
import type { Reward } from "@/content/rewards";
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

/** A completion reward the session unlocked, in the rewards panel's colors. Prototype. */
function RewardUnlocked({ reward }: { reward: Reward }) {
  return (
    <li className="flex items-start gap-3 rounded-2xl bg-dusk p-4 text-white">
      <span className="grid size-9 shrink-0 place-items-center rounded-[0.7rem] bg-marigold text-dusk">
        <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5 fill-current">
          <path d="m12 2.8 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.1 6.4 20l1.1-6.2L3 9.4l6.2-.9L12 2.8Z" />
        </svg>
      </span>
      <p className="flex flex-col gap-0.5">
        <span className="font-semibold">Reward unlocked: {reward.kid}</span>
        <span className="text-sm text-white/75">{reward.trigger}, done. Prototype reward.</span>
      </p>
    </li>
  );
}

function Earned({ rewards }: Pick<SessionSummary, "rewards">) {
  const { xp, awards, streak, badges, unlocks } = rewards;
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
      {unlocks.length > 0 && (
        <ul aria-label="Rewards unlocked" className="flex flex-col gap-2">
          {unlocks.map((reward) => (
            <RewardUnlocked key={reward.key} reward={reward} />
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
