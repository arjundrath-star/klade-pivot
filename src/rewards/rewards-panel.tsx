import { Badge } from "@/components/ui/badge";
import { Card, cardClass } from "@/components/ui/card";
import { CheckGlyph } from "@/components/ui/glyphs";
import { PanelHeader } from "@/components/ui/panel-header";
import { ProgressBar } from "@/components/ui/progress";
import { inSentence } from "@/content/title";
import type { BoardEntry, Reward } from "@/content/rewards";
import { formatDate, plural, sessionCount } from "@/parent/progress";

interface RewardsPanelProps {
  entries: readonly BoardEntry[];
  /** Sessions owed against the schedule, from the student's real pace. */
  behind: number;
  viewer: { kind: "student" } | { kind: "parent"; name: string; targetDate: string };
}

/** "3 of 4 weeks". */
function countLabel({ current, target, reward }: BoardEntry): string {
  return `${current} of ${plural(target, reward.counts)}`;
}

/** A paced reward's line for the parent, from the real schedule: on pace, or how far behind. */
function paceLine(reward: Reward, behind: number, targetDate: string): string {
  const prize = inSentence(reward.parent);
  const by = formatDate(targetDate);
  return behind === 0
    ? `On pace: finish by ${by} → ${prize}`
    : `${sessionCount(behind)} behind. Catch up to finish by ${by} → ${prize}`;
}

/** The kid's pace on a reward that reads it and is still to earn. */
function kidPace({ reward, unlocked }: BoardEntry, behind: number): string {
  if (!reward.paced || unlocked) return "";
  return behind === 0 ? "You're on pace." : `You're ${sessionCount(behind)} behind.`;
}

/**
 * Progress toward the completion rewards (steering §4.1), on the kid's and the parent's views.
 * Server-rendered from the rows and the live standing the page already read. Prototype: nothing
 * here touches billing.
 */
export function RewardsPanel({ entries, behind, viewer }: RewardsPanelProps) {
  const parent = viewer.kind === "parent" ? viewer : undefined;
  const paced = entries.find((entry) => entry.reward.paced && !entry.unlocked);
  const earned = entries.filter((entry) => entry.unlocked);
  return (
    <Card aria-labelledby="rewards-heading" tone="progress" className="flex flex-col gap-5">
      <PanelHeader
        id="rewards-heading"
        title={parent ? `${parent.name}'s rewards` : "Your rewards"}
        aside={<Badge tone="outline">Prototype</Badge>}
      >
        <p>
          {parent
            ? "Earned by doing the work on schedule, never by scores or speed. Paid in Klade: free months, discounts and mentor check-ins, never cash or gift cards."
            : "Do the work on schedule and these unlock. They're paid in Klade, never in cash."}
        </p>
      </PanelHeader>

      {parent && (paced || earned.length > 0) && (
        <div className="flex flex-col gap-1.5 text-lg leading-snug font-semibold">
          {paced && <p>{paceLine(paced.reward, behind, parent.targetDate)}</p>}
          {earned.map((entry) => (
            <p key={entry.reward.key} className="text-success">
              Earned: {inSentence(entry.reward.parent)}
            </p>
          ))}
        </div>
      )}

      <ul aria-label="Rewards" className="flex flex-col gap-4">
        {entries.map((entry) => {
          const { reward } = entry;
          const prize = parent ? reward.parent : reward.kid;
          return (
            <li key={reward.key} className={`${cardClass("well", "xs")} flex flex-col gap-2`}>
              <div className="flex items-baseline justify-between gap-4">
                <p className="font-semibold">{prize}</p>
                {entry.unlocked ? (
                  <Badge tone="success">
                    <CheckGlyph className="size-3.5" />
                    Unlocked
                  </Badge>
                ) : (
                  <span className="shrink-0 text-sm text-ink-soft tabular-nums">
                    {countLabel(entry)}
                  </span>
                )}
              </div>
              <ProgressBar
                label={`${reward.trigger}: ${countLabel(entry)}`}
                value={entry.current}
                max={entry.target}
                tone={entry.unlocked ? "success" : "progress"}
                segmented
              />
              <p className="text-sm text-ink-soft">
                {reward.trigger}. {parent ? reward.cap : kidPace(entry, behind)}
              </p>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
