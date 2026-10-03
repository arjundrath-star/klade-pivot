import Link from "next/link";
import type { CSSProperties } from "react";
import { BadgeItem } from "@/app/student/badge-item";
import { buttonClass } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FlameGlyph } from "@/components/ui/glyphs";
import { inSentence } from "@/content/title";
import { streakLabel, XP_LABELS } from "@/parent/progress";
import type { SessionSummary } from "@/session/complete";
import { EXIT_PASS_MARK } from "@/session/mastery";
import type { StreakChange } from "@/session/rewards";
import { StartOver } from "@/visitor/start-over";

interface SessionCompleteProps {
  title: string;
  /** Absent only for a session finished before verdicts were recorded. */
  summary?: SessionSummary;
  /** The student is a visitor's copy of the demo, which can start over from here. */
  restart?: boolean;
}

const MUTED = "text-sm text-ink-soft";

/** The one reveal on this screen: each block rises in turn, and not at all with reduced motion. */
const RISE = "motion-safe:animate-rise";

function delay(step: number): CSSProperties {
  return { animationDelay: `${step * 110}ms` };
}

function streakChangeLine({ before, after, sessionDay, alreadyCounted }: StreakChange): string {
  const restored = after.untilFreeze === 0 && before.untilFreeze > 0;
  const freeze = restored ? " Your streak freeze is back." : "";
  if (!sessionDay) return "This was not a scheduled session day, so the streak stays the same.";
  if (alreadyCounted) return "A session already counted for this day.";
  return `Up from ${before.count}: done on its day.${freeze}`;
}

/** What the session earned: the XP and the streak side by side, then the badges and rewards. */
function Earned({ rewards }: Pick<SessionSummary, "rewards">) {
  const { xp, awards, streak, badges, unlocks } = rewards;
  return (
    <section aria-labelledby="earned-heading" className="flex flex-col gap-5">
      <h2 id="earned-heading" className="font-display text-lg font-semibold">
        This session
      </h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <div
          className={`flex flex-col gap-1 rounded-lg bg-progress-tint p-5 ${RISE}`}
          style={delay(1)}
        >
          <p className="font-display text-5xl leading-none font-bold tracking-tight text-progress-deep tabular-nums">
            +{xp} XP
          </p>
          {awards.length > 0 && (
            <ul className={`mt-2 ${MUTED}`}>
              {awards.map((award) => (
                <li key={award.kind}>
                  {XP_LABELS[award.kind]}: {award.amount} XP
                </li>
              ))}
            </ul>
          )}
        </div>
        <div
          className={`flex items-center gap-4 rounded-lg bg-today-tint p-5 ${RISE}`}
          style={delay(2)}
        >
          <FlameGlyph className="size-9 shrink-0 text-today-deep" />
          <div className="flex flex-col gap-1">
            <p className="font-display text-2xl leading-none font-semibold">
              {streakLabel(streak.after.count)}
            </p>
            <p className={MUTED}>{streakChangeLine(streak)}</p>
          </div>
        </div>
      </div>
      {badges.length > 0 && (
        <ul aria-label="Badges earned" className={`divide-y divide-line ${RISE}`} style={delay(3)}>
          {badges.map((badge) => (
            <BadgeItem key={badge.key} label={badge.label} detail={badge.detail} />
          ))}
        </ul>
      )}
      {unlocks.length > 0 && (
        <ul
          aria-label="Rewards unlocked"
          className={`divide-y divide-line ${RISE}`}
          style={delay(4)}
        >
          {unlocks.map((reward) => (
            <BadgeItem
              key={reward.key}
              label={`Reward unlocked: ${reward.kid}`}
              detail={`${reward.trigger}, done. Prototype reward.`}
              tone="mentor"
            />
          ))}
        </ul>
      )}
    </section>
  );
}

export function SessionComplete({ title, summary, restart = false }: SessionCompleteProps) {
  const mastered = summary?.outcome === "mastered";
  return (
    <div className="flex flex-col gap-8">
      <Card tone={mastered ? "today" : "surface"} className={`flex flex-col gap-3 sm:p-8 ${RISE}`}>
        <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">
          {mastered ? "Mastered" : "Session done"}
        </h1>
        {summary === undefined ? (
          <p className="text-ink-soft">You finished {title}.</p>
        ) : mastered ? (
          <p className="max-w-prose text-lg text-ink-soft">
            You got {summary.exitCorrect} of {summary.exitTotal} on the exit check and passed your
            explain-back. You have mastered {inSentence(title)}.
          </p>
        ) : (
          <>
            <p className="text-lg font-semibold">This concept repeats next session.</p>
            <p className="max-w-prose text-ink-soft">
              You got {summary.exitCorrect} of {summary.exitTotal} on the exit check
              {summary.explainPassed ? "" : " and your explain-back did not pass"}. Mastery takes{" "}
              {EXIT_PASS_MARK} of {summary.exitTotal} and a passed explain-back.
            </p>
          </>
        )}
      </Card>
      {summary && <Earned rewards={summary.rewards} />}
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/student" className={buttonClass("primary")}>
          Back to today
        </Link>
        {restart && <StartOver />}
      </div>
    </div>
  );
}
