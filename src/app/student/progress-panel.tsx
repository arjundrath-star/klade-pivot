import { ALGEBRA1_BADGES, ALGEBRA1_CONTENT } from "@/content/algebra1/concepts";
import { currentUnit, level, type Streak } from "@/engine/progress";
import { freezeLabel, plural, streakLabel } from "@/parent/progress";

const HEADING = "text-sm font-medium tracking-wide text-zinc-600 uppercase dark:text-zinc-400";
const MUTED = "text-zinc-600 dark:text-zinc-400";
const EARNED = "bg-amber-100 text-amber-950 dark:bg-amber-900 dark:text-amber-50";
const LOCKED = `border border-dashed border-zinc-300 dark:border-zinc-700 ${MUTED}`;
const SECTION = "flex flex-col gap-4 rounded-lg border border-zinc-200 p-6 dark:border-zinc-800";

interface ProgressPanelProps {
  xp: number;
  streak: Streak;
  /** Content keys of the concepts the student has mastered. */
  mastered: ReadonlySet<string>;
  /** Keys of the badges the student has earned. */
  earned: ReadonlySet<string>;
}

function Flame() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-8 w-8 fill-orange-500">
      <path d="M12 2c.6 3.2-1 5.3-2.6 7.2C7.8 11 6 13 6 15.8 6 19.2 8.7 22 12 22s6-2.8 6-6.2c0-2.4-1.2-4.1-2.4-5.5-.3 1.4-1 2.5-2.1 3 .3-3.9-.6-8.4-1.5-11.3Z" />
    </svg>
  );
}

/** The kid's XP and level, streak and badge shelf. Server-rendered; no client code. */
export function ProgressPanel({ xp, streak, mastered, earned }: ProgressPanelProps) {
  const unit = currentUnit(ALGEBRA1_CONTENT, mastered);
  const earnedCount = ALGEBRA1_BADGES.filter((badge) => earned.has(badge.key)).length;
  return (
    <section aria-labelledby="progress-heading" className={SECTION}>
      <h2 id="progress-heading" className={HEADING}>
        Your progress
      </h2>
      <div className="flex flex-col gap-2">
        <p className="flex items-baseline justify-between gap-4">
          <span className="text-xl font-semibold">Level {level(ALGEBRA1_CONTENT, mastered)}</span>
          <span className="font-semibold">{xp} XP</span>
        </p>
        {unit && (
          <>
            <div
              role="progressbar"
              aria-label={`Unit ${unit.number} concepts mastered`}
              aria-valuemin={0}
              aria-valuemax={unit.total}
              aria-valuenow={unit.mastered}
              className="h-3 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800"
            >
              <div
                className="h-full rounded-full bg-emerald-600"
                style={{ width: `${(unit.mastered / unit.total) * 100}%` }}
              />
            </div>
            <p className={`text-sm ${MUTED}`}>
              Unit {unit.number}: {unit.mastered} of {plural(unit.total, "concept")} mastered. A
              level for every unit you master.
            </p>
          </>
        )}
      </div>
      <div className="flex items-center gap-3">
        <Flame />
        <div className="flex flex-col">
          <p className="text-lg font-semibold">{streakLabel(streak.count)}</p>
          <p className={`text-sm ${MUTED}`}>{freezeLabel(streak)}</p>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <h3 className="font-medium">
          Badges: {earnedCount} of {ALGEBRA1_BADGES.length}
        </h3>
        <ul aria-label="Badge shelf" className="grid gap-2 sm:grid-cols-2">
          {ALGEBRA1_BADGES.map((badge) => {
            const has = earned.has(badge.key);
            return (
              <li
                key={badge.key}
                className={`flex flex-col rounded-md p-3 ${has ? EARNED : LOCKED}`}
              >
                <span className="font-semibold">{badge.label}</span>
                <span className="text-sm">{has ? badge.detail : "Not earned yet"}</span>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
