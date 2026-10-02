import { ALGEBRA1_COURSE, ALGEBRA1_TITLE } from "@/content/algebra1/course";
import type { CourseProgress } from "@/engine/course";
import { currentUnit, level, type Streak } from "@/engine/progress";
import { freezeLabel, plural, streakLabel } from "@/parent/progress";

const TILE = "card flex flex-col gap-2";
const MUTED = "text-sm text-zinc-600 dark:text-zinc-400";
const FIGURE = "font-display text-3xl leading-none font-semibold tracking-tight";

/** Concepts mastered of the course's total, one pip per concept, and the units done. */
export function CourseProgressTile({ progress }: { progress: CourseProgress }) {
  const { mastered, total, percent, unitsDone, units } = progress;
  return (
    <section aria-labelledby="course-progress-heading" className={TILE}>
      <h2 id="course-progress-heading" className={MUTED}>
        Course progress
      </h2>
      <p className="flex items-baseline gap-2">
        <span className={FIGURE}>
          {mastered} of {total}
        </span>
        <span className={MUTED}>concepts mastered</span>
      </p>
      <div
        role="progressbar"
        aria-label="Course progress"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={mastered}
        aria-valuetext={`${mastered} of ${total} concepts mastered`}
        className="flex flex-wrap gap-1"
      >
        {Array.from({ length: total }, (_, index) => (
          <span
            key={index}
            className={`h-2 w-2 rounded-[2px] ${index < mastered ? "bg-mint" : "bg-zinc-200 dark:bg-zinc-800"}`}
          />
        ))}
      </div>
      <p className={MUTED}>
        {percent}% of {ALGEBRA1_TITLE}. {unitsDone} of {plural(units, "unit")} done.
      </p>
    </section>
  );
}

/** The level, the XP total and the bar to the next level: the current unit's concepts. */
export function LevelTile({ xp, mastered }: { xp: number; mastered: ReadonlySet<string> }) {
  const current = level(ALGEBRA1_COURSE, mastered);
  const unit = currentUnit(ALGEBRA1_COURSE, mastered);
  return (
    <section aria-labelledby="level-heading" className={TILE}>
      <div className="flex items-baseline justify-between gap-4">
        <h2 id="level-heading" className={FIGURE}>
          Level {current}
        </h2>
        <p className="font-semibold tabular-nums">{xp} XP</p>
      </div>
      {unit && (
        <>
          <div
            role="progressbar"
            aria-label={`Unit ${unit.number} concepts mastered`}
            aria-valuemin={0}
            aria-valuemax={unit.total}
            aria-valuenow={unit.mastered}
            className="h-2.5 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800"
          >
            <div
              className="h-full rounded-full bg-marigold"
              style={{ width: `${(unit.mastered / unit.total) * 100}%` }}
            />
          </div>
          <p className={MUTED}>
            Unit {unit.number}: {unit.mastered} of {plural(unit.total, "concept")} mastered. Master
            the unit to reach Level {current + 1}.
          </p>
        </>
      )}
    </section>
  );
}

function Flame() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-10 shrink-0 fill-orange-500">
      <path d="M12 2c.6 3.2-1 5.3-2.6 7.2C7.8 11 6 13 6 15.8 6 19.2 8.7 22 12 22s6-2.8 6-6.2c0-2.4-1.2-4.1-2.4-5.5-.3 1.4-1 2.5-2.1 3 .3-3.9-.6-8.4-1.5-11.3Z" />
    </svg>
  );
}

/** Scheduled sessions done in a row, and whether the streak freeze is banked. */
export function StreakTile({ streak }: { streak: Streak }) {
  return (
    <section aria-labelledby="streak-heading" className={`${TILE} flex-row items-center gap-4`}>
      <Flame />
      <div className="flex flex-col gap-1">
        <h2 id="streak-heading" className="font-display text-2xl leading-none font-semibold">
          {streakLabel(streak.count)}
        </h2>
        <p className={MUTED}>{freezeLabel(streak)}</p>
      </div>
    </section>
  );
}
