import { ALGEBRA1_TITLE } from "@/content/algebra1/course";

/**
 * The student's classes. One exists today, so Algebra I is shown selected and the next course is
 * shown as coming, not as a choice.
 */
export function ClassSelector() {
  return (
    <div role="group" aria-label="Class" className="flex flex-wrap gap-2">
      <span
        aria-current="true"
        className="inline-flex min-h-10 items-center gap-2 rounded-full bg-ink px-4 text-sm font-semibold text-white"
      >
        <span aria-hidden="true" className="size-2 rounded-full bg-today" />
        {ALGEBRA1_TITLE}
      </span>
      <button
        type="button"
        disabled
        className="inline-flex min-h-10 cursor-not-allowed items-center rounded-full border border-dashed border-line-strong px-4 text-sm font-medium text-ink-faint"
      >
        Geometry · coming soon
      </button>
    </div>
  );
}
