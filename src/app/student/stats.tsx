import type { ReactNode } from "react";
import { FlameGlyph } from "@/components/ui/glyphs";
import { ProgressBar } from "@/components/ui/progress";
import { ALGEBRA1_COURSE, ALGEBRA1_TITLE } from "@/content/algebra1/course";
import type { CourseProgress } from "@/engine/course";
import { currentUnit, level, type Streak } from "@/engine/progress";
import { freezeLabel, plural, streakLabel } from "@/parent/progress";

const MUTED = "text-sm text-ink-soft";
const FIGURE = "font-display text-2xl leading-none font-semibold tracking-tight tabular-nums";

/**
 * The student's standing as one strip: a column per figure, divided by hairlines, so the figures
 * read as one row of facts and not as a row of boxes.
 */
export function StatStrip({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section
      aria-label={label}
      className="grid divide-y divide-line rounded-lg border border-line bg-white sm:grid-flow-col sm:auto-cols-fr sm:divide-x sm:divide-y-0"
    >
      {children}
    </section>
  );
}

const HEADING_TONES = {
  course: "text-course-deep",
  progress: "text-progress-deep",
  today: "text-today-deep",
} as const;

/** One column of the strip: its heading in the feature's color, then the figure and its lines. */
function Stat({
  heading,
  tone,
  children,
}: {
  heading: string;
  tone: keyof typeof HEADING_TONES;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2 p-5">
      <h2 className={`text-sm font-semibold ${HEADING_TONES[tone]}`}>{heading}</h2>
      {children}
    </div>
  );
}

/** Concepts mastered of the course's total, one pip per concept, and the units done. */
export function CourseProgressStat({ progress }: { progress: CourseProgress }) {
  const { mastered, total, percent, unitsDone, units } = progress;
  return (
    <Stat heading="Course progress" tone="course">
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
    </Stat>
  );
}

/** The level, the XP total and the bar to the next level: the current unit's concepts. */
export function LevelStat({ xp, mastered }: { xp: number; mastered: ReadonlySet<string> }) {
  const current = level(ALGEBRA1_COURSE, mastered);
  const unit = currentUnit(ALGEBRA1_COURSE, mastered);
  return (
    <Stat heading="Level and XP" tone="progress">
      <p className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <span className={FIGURE}>Level {current}</span>
        <span className="font-display text-lg leading-none font-semibold tabular-nums">
          {xp} XP
        </span>
      </p>
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
    </Stat>
  );
}

/** Scheduled sessions done in a row, and whether the streak freeze is banked. */
export function StreakStat({ streak }: { streak: Streak }) {
  return (
    <Stat heading="Streak" tone="today">
      <p className="flex items-center gap-3">
        <FlameGlyph className="size-6 shrink-0 text-today-deep" />
        <span className={FIGURE}>{streakLabel(streak.count)}</span>
      </p>
      <p className={MUTED}>{freezeLabel(streak)}</p>
    </Stat>
  );
}
