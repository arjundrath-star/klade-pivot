import { Card } from "@/components/ui/card";
import { FlameGlyph } from "@/components/ui/glyphs";
import { ProgressBar } from "@/components/ui/progress";
import { ALGEBRA1_COURSE, ALGEBRA1_TITLE } from "@/content/algebra1/course";
import type { CourseProgress } from "@/engine/course";
import { currentUnit, level, type Streak } from "@/engine/progress";
import { freezeLabel, plural, streakLabel } from "@/parent/progress";

const MUTED = "text-sm text-ink-soft";
const FIGURE = "font-display text-2xl leading-none font-semibold tracking-tight";

/** Concepts mastered of the course's total, one pip per concept, and the units done. */
export function CourseProgressTile({ progress }: { progress: CourseProgress }) {
  const { mastered, total, percent, unitsDone, units } = progress;
  return (
    <Card aria-labelledby="course-progress-heading" padding="sm" className="flex flex-col gap-2">
      <h2 id="course-progress-heading" className="text-sm font-semibold text-course-deep">
        Course progress
      </h2>
      <p className="flex flex-col gap-1">
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
            className={`h-2 w-2 rounded-[2px] ${index < mastered ? "bg-course" : "bg-track"}`}
          />
        ))}
      </div>
      <p className={MUTED}>
        {percent}% of {ALGEBRA1_TITLE}. {unitsDone} of {plural(units, "unit")} done.
      </p>
    </Card>
  );
}

/** The level, the XP total and the bar to the next level: the current unit's concepts. */
export function LevelTile({ xp, mastered }: { xp: number; mastered: ReadonlySet<string> }) {
  const current = level(ALGEBRA1_COURSE, mastered);
  const unit = currentUnit(ALGEBRA1_COURSE, mastered);
  return (
    <Card aria-labelledby="level-heading" padding="sm" className="flex flex-col gap-2">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 id="level-heading" className={FIGURE}>
          Level {current}
        </h2>
        <p className="font-display text-lg leading-none font-semibold text-progress-deep tabular-nums">
          {xp} XP
        </p>
      </div>
      {unit && (
        <>
          <ProgressBar
            label={`Unit ${unit.number} concepts mastered`}
            value={unit.mastered}
            max={unit.total}
            tone="progress"
          />
          <p className={MUTED}>
            Unit {unit.number}: {unit.mastered} of {plural(unit.total, "concept")} mastered. Master
            the unit to reach Level {current + 1}.
          </p>
        </>
      )}
    </Card>
  );
}

/** Scheduled sessions done in a row, and whether the streak freeze is banked. */
export function StreakTile({ streak }: { streak: Streak }) {
  return (
    <Card
      aria-labelledby="streak-heading"
      padding="sm"
      className="flex flex-row items-center gap-4"
    >
      <span className="grid size-11 shrink-0 place-items-center rounded-md bg-today-tint text-today-deep">
        <FlameGlyph className="size-6" />
      </span>
      <div className="flex flex-col gap-1">
        <h2 id="streak-heading" className="font-display text-xl leading-tight font-semibold">
          {streakLabel(streak.count)}
        </h2>
        <p className={MUTED}>{freezeLabel(streak)}</p>
      </div>
    </Card>
  );
}
