import { buttonClass } from "@/components/ui/button";
import { CheckGlyph, ChevronGlyph } from "@/components/ui/glyphs";
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
  /** The unit headings' level: h2 under a page heading, h3 inside a panel with its own h2. */
  unitHeading: "h2" | "h3";
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
 * The course as a map: one row per unit, each a native disclosure that shows the unit's title,
 * progress bar and mastered count when closed and its summary and concepts as nodes on a rail
 * when open. The unit holding today's concept starts open, the rest closed, so the page reads as
 * nine rows first. Mastered nodes are filled, today's node is the only one that leads anywhere,
 * and upcoming nodes are plain text, built or not. Server-rendered; no client code.
 */
export function CourseMap({
  units,
  mastered,
  currentKey,
  today,
  notes,
  unitHeading: UnitHeading,
}: CourseMapProps) {
  return (
    <div className="flex flex-col gap-4">
      <ul aria-label="Legend" className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-ink-soft">
        {(["mastered", "current", "upcoming"] as const).map((state) => (
          <li key={state} className="flex items-center gap-2">
            <Glyph state={state} />
            {STATE_LABELS[state]}
          </li>
        ))}
      </ul>
      <ol className="divide-y divide-line border-y border-line">
        {units.map((unit) => {
          const done = unit.concepts.filter((concept) => mastered.has(concept.key)).length;
          const open = unit.concepts.some((concept) => concept.key === currentKey);
          return (
            <li key={unit.number}>
              <details open={open} className="group">
                <summary className="focus-ring flex cursor-pointer list-none items-center gap-4 rounded-sm py-4 hover:bg-well [&::-webkit-details-marker]:hidden">
                  <span className="flex min-w-0 flex-1 flex-col gap-2">
                    <span className="flex flex-col gap-x-4 gap-y-0.5 sm:flex-row sm:items-baseline sm:justify-between">
                      <UnitHeading className="font-display text-lg leading-tight font-semibold">
                        <span className="mr-2 font-sans text-sm font-medium text-ink-soft">
                          Unit {unit.number}
                        </span>
                        {unit.title}
                      </UnitHeading>
                      <span className="shrink-0 text-sm text-ink-soft tabular-nums">
                        {done} of {unit.concepts.length} mastered
                      </span>
                    </span>
                    <ProgressBar
                      label={`Unit ${unit.number} progress`}
                      value={done}
                      max={unit.concepts.length}
                      tone="course"
                      size="thin"
                    />
                  </span>
                  <ChevronGlyph className="size-5 shrink-0 text-ink-soft transition-transform group-open:rotate-180 motion-reduce:transition-none" />
                </summary>
                <div className="flex flex-col gap-3 pb-4">
                  {unit.summary && (
                    <p className="max-w-prose text-sm text-ink-soft">{unit.summary}</p>
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
                </div>
              </details>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
