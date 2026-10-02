import Link from "next/link";
import type { CSSProperties } from "react";
import { BadgeItem } from "@/app/student/badge-item";
import { buttonClass } from "@/components/ui/button";
import { Card, cardClass } from "@/components/ui/card";
import { FlameGlyph, StarGlyph } from "@/components/ui/glyphs";
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

/** A completion reward the session unlocked. Prototype. */
function RewardUnlocked({ reward }: { reward: Reward }) {
  return (
    <li className={`${cardClass("mentor", "xs")} flex items-start gap-3 rounded-md`}>
      <span className="grid size-9 shrink-0 place-items-center rounded-sm bg-mentor-deep text-white">
        <StarGlyph className="size-5" />
      </span>
      <p className="flex flex-col gap-0.5">
        <span className="font-semibold">Reward unlocked: {reward.kid}</span>
        <span className={MUTED}>{reward.trigger}, done. Prototype reward.</span>
      </p>
    </li>
  );
}

function Earned({ rewards }: Pick<SessionSummary, "rewards">) {
  const { xp, awards, streak, badges, unlocks } = rewards;
  return (
    <Card aria-labelledby="earned-heading" className="flex flex-col gap-5">
      <h2 id="earned-heading" className="font-display text-xl font-semibold">
        This session
      </h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <div
          className={`flex flex-col gap-1 rounded-md bg-progress-tint p-4 ${RISE}`}
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
          className={`flex items-center gap-4 rounded-md bg-today-tint p-4 ${RISE}`}
          style={delay(2)}
        >
          <span className="grid size-12 shrink-0 place-items-center rounded-md bg-today text-ink">
            <FlameGlyph className="size-7" />
          </span>
          <div className="flex flex-col gap-1">
            <p className="font-display text-2xl leading-none font-semibold">
              {streakLabel(streak.after.count)}
            </p>
            <p className={MUTED}>{streakChangeLine(streak)}</p>
          </div>
        </div>
      </div>
      {badges.length > 0 && (
        <ul aria-label="Badges earned" className={`flex flex-col gap-2 ${RISE}`} style={delay(3)}>
          {badges.map((badge) => (
            <BadgeItem key={badge.key} label={badge.label} detail={badge.detail} surface="white" />
          ))}
        </ul>
      )}
      {unlocks.length > 0 && (
        <ul
          aria-label="Rewards unlocked"
          className={`flex flex-col gap-2 ${RISE}`}
          style={delay(4)}
        >
          {unlocks.map((reward) => (
            <RewardUnlocked key={reward.key} reward={reward} />
          ))}
        </ul>
      )}
    </Card>
  );
}

export function SessionComplete({ title, summary }: SessionCompleteProps) {
  const mastered = summary?.outcome === "mastered";
  return (
    <div className="flex flex-col gap-5">
      <Card tone={mastered ? "today" : "surface"} className={`flex flex-col gap-3 sm:p-8 ${RISE}`}>
        <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">
          {mastered ? "Mastered" : "Session done"}
        </h1>
        {summary === undefined ? (
          <p className="text-ink-soft">You finished {title}.</p>
        ) : mastered ? (
          <p className="text-lg text-ink-soft">
            You got {summary.exitCorrect} of {summary.exitTotal} on the exit check and passed your
            explain-back. You have mastered {inSentence(title)}.
          </p>
        ) : (
          <>
            <p className="text-lg font-semibold">This concept repeats next session.</p>
            <p className="text-ink-soft">
              You got {summary.exitCorrect} of {summary.exitTotal} on the exit check
              {summary.explainPassed ? "" : " and your explain-back did not pass"}. Mastery takes{" "}
              {EXIT_PASS_MARK} of {summary.exitTotal} and a passed explain-back.
            </p>
          </>
        )}
      </Card>
      {summary && <Earned rewards={summary.rewards} />}
      <Link href="/student" className={`${buttonClass("primary")} self-start`}>
        Back to today
      </Link>
    </div>
  );
}
