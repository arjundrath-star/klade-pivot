import { inSentence } from "@/content/title";
import type { BoardEntry, Reward } from "@/content/rewards";
import { formatDate, plural, sessionCount } from "@/parent/progress";

/** Tracks up to this long draw one segment per step; longer ones draw a plain bar. */
const MAX_SEGMENTS = 8;

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

function Track({ entry, label }: { entry: BoardEntry; label: string }) {
  const { current, target, unlocked } = entry;
  const fill = unlocked ? "bg-mint" : "bg-marigold";
  const bar = {
    role: "progressbar",
    "aria-label": label,
    "aria-valuemin": 0,
    "aria-valuemax": target,
    "aria-valuenow": current,
  } as const;
  if (target <= MAX_SEGMENTS) {
    return (
      <div {...bar} className="flex gap-1.5">
        {Array.from({ length: target }, (_, step) => (
          <span
            key={step}
            className={`h-2.5 flex-1 rounded-full ${step < current ? fill : "bg-white/14"}`}
          />
        ))}
      </div>
    );
  }
  return (
    <div {...bar} className="h-2.5 overflow-hidden rounded-full bg-white/14">
      <div
        className={`h-full rounded-full ${fill}`}
        style={{ width: `${(current / target) * 100}%` }}
      />
    </div>
  );
}

function Unlocked() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-mint px-2 py-0.5 text-xs font-semibold text-dusk">
      <svg viewBox="0 0 16 16" aria-hidden="true" className="size-3.5 fill-none stroke-current">
        <path d="m3.5 8.5 3 3 6-7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      Unlocked
    </span>
  );
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
    <section
      aria-labelledby="rewards-heading"
      className="bg-dusk-glow flex flex-col gap-5 rounded-[1.75rem] p-6 text-white shadow-[0_28px_56px_-28px_rgba(27,24,56,0.7)]"
    >
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-4">
          <h2 id="rewards-heading" className="text-xl font-semibold">
            {parent ? `${parent.name}'s rewards` : "Your rewards"}
          </h2>
          <span className="rounded-full px-2.5 py-0.5 text-xs font-medium text-white/80 ring-1 ring-white/25">
            Prototype
          </span>
        </div>
        <p className="text-sm text-white/75">
          {parent
            ? "Earned by doing the work on schedule, never by scores or speed. Paid in Klade: free months, discounts and mentor check-ins, never cash or gift cards."
            : "Do the work on schedule and these unlock. They're paid in Klade, never in cash."}
        </p>
      </div>

      {parent && (paced || earned.length > 0) && (
        <div className="flex flex-col gap-1.5 text-lg leading-snug font-semibold">
          {paced && <p>{paceLine(paced.reward, behind, parent.targetDate)}</p>}
          {earned.map((entry) => (
            <p key={entry.reward.key} className="text-mint">
              Earned: {inSentence(entry.reward.parent)}
            </p>
          ))}
        </div>
      )}

      <ul aria-label="Rewards" className="flex flex-col gap-5">
        {entries.map((entry) => {
          const { reward } = entry;
          const prize = parent ? reward.parent : reward.kid;
          return (
            <li key={reward.key} className="flex flex-col gap-2">
              <div className="flex items-baseline justify-between gap-4">
                <p className="font-semibold">{prize}</p>
                {entry.unlocked ? (
                  <Unlocked />
                ) : (
                  <span className="shrink-0 text-sm text-white/80 tabular-nums">
                    {countLabel(entry)}
                  </span>
                )}
              </div>
              <Track entry={entry} label={`${reward.trigger}: ${countLabel(entry)}`} />
              <p className="text-sm text-white/70">
                {reward.trigger}. {parent ? reward.cap : kidPace(entry, behind)}
              </p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
