import { buttonClass } from "@/components/ui/button";
import { CheckGlyph } from "@/components/ui/glyphs";
import { ProgressBar } from "@/components/ui/progress";
import {
  nodeState,
  standardLabel,
  type CourseConceptOutline,
  type CourseUnitOutline,
  type NodeState,
} from "@/engine/course";

interface CourseMapProps {
  units: readonly CourseUnitOutline[];
  /** Content keys of the concepts the student has mastered. */
  mastered: ReadonlySet<string>;
  /** The concept of today's session; null when every playable concept is mastered. */
  currentKey: string | null;
  /**
   * On the student's map, the action that opens or resumes today's session, which the current
   * node submits. The parent's map has none and names the node "Next session" instead.
   */
  today?: () => Promise<void>;
  /** The parent's map: a note under a concept, such as its exit-check score or a repeat. */
  notes?: ReadonlyMap<string, string>;
  /** The parent's overview: two unit columns and no unit summaries. */
  condensed?: boolean;
}

const STATE_LABELS: Readonly<Record<NodeState, string>> = {
  mastered: "Mastered",
  current: "Today",
  upcoming: "Upcoming",
};

function Glyph({ state }: { state: NodeState }) {
  if (state === "mastered") {
    return (
      <span className="grid size-5 shrink-0 place-items-center rounded-full bg-success-fill text-ink">
        <CheckGlyph className="size-3" />
      </span>
    );
  }
  if (state === "current") {
    return (
      <span className="grid size-5 shrink-0 place-items-center rounded-full bg-today ring-4 ring-today/30">
        <span className="size-2 rounded-full bg-ink" />
      </span>
    );
  }
  return <span className="size-5 shrink-0 rounded-full border-2 border-line-strong" />;
}

function Node({
  concept,
  state,
  last,
  today,
  note,
}: {
  concept: CourseConceptOutline;
  state: NodeState;
  last: boolean;
  today: (() => Promise<void>) | undefined;
  note: string | undefined;
}) {
  const title =
    state === "current" ? "font-semibold" : state === "mastered" ? "" : "text-ink-faint";
  return (
    <li className="flex gap-3">
      <span className="flex shrink-0 flex-col items-center gap-1 pt-0.5">
        <Glyph state={state} />
        {!last && <span className="w-0.5 flex-1 bg-line" />}
      </span>
      <div className="flex flex-col pb-3">
        <p className={`text-sm leading-snug ${title}`}>
          <span className="sr-only">{STATE_LABELS[state]}: </span>
          {concept.title}
        </p>
        <p className="text-xs text-ink-faint tabular-nums">
          {standardLabel(concept)}
          {note && `, ${note}`}
        </p>
        {state === "current" &&
          (today ? (
            <form action={today} className="mt-1.5">
              <button type="submit" className={buttonClass("primary", "sm")}>
                Go to today&apos;s session
              </button>
            </form>
          ) : (
            <p className="text-xs font-semibold text-today-deep">Next session</p>
          ))}
      </div>
    </li>
  );
}

/**
 * The course as a map: every unit with a progress bar, every concept as a node on a rail with its
 * standard code, in three states. Mastered nodes are filled, today's node is the only one that
 * leads anywhere, and upcoming nodes are plain text, built or not. Server-rendered; no client code.
 */
export function CourseMap({
  units,
  mastered,
  currentKey,
  today,
  notes,
  condensed = false,
}: CourseMapProps) {
  return (
    <div className="flex flex-col gap-5">
      <ul aria-label="Legend" className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-ink-soft">
        {(["mastered", "current", "upcoming"] as const).map((state) => (
          <li key={state} className="flex items-center gap-2">
            <Glyph state={state} />
            {STATE_LABELS[state]}
          </li>
        ))}
      </ul>
      <ol className={`grid gap-x-8 gap-y-7 md:grid-cols-2 ${condensed ? "" : "xl:grid-cols-3"}`}>
        {units.map((unit) => {
          const done = unit.concepts.filter((concept) => mastered.has(concept.key)).length;
          return (
            <li key={unit.number} className="flex flex-col gap-3">
              <div className="flex flex-col gap-2">
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="font-display text-lg leading-tight font-semibold">
                    <span className="mr-2 text-sm font-medium text-course-deep">
                      Unit {unit.number}
                    </span>
                    {unit.title}
                  </h3>
                  <span className="shrink-0 text-sm text-ink-soft tabular-nums">
                    {done} of {unit.concepts.length}
                  </span>
                </div>
                <ProgressBar
                  label={`Unit ${unit.number} progress`}
                  value={done}
                  max={unit.concepts.length}
                  tone="course"
                  size="thin"
                />
              </div>
              {!condensed && unit.summary && (
                <p className="text-sm text-ink-soft">{unit.summary}</p>
              )}
              <ol>
                {unit.concepts.map((concept, index) => (
                  <Node
                    key={concept.key}
                    concept={concept}
                    state={nodeState(concept.key, mastered, currentKey)}
                    last={index === unit.concepts.length - 1}
                    today={today}
                    note={notes?.get(concept.key)}
                  />
                ))}
              </ol>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
