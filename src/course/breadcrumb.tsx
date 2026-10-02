import { ALGEBRA1_COURSE, ALGEBRA1_TITLE } from "@/content/algebra1/course";
import { conceptPlace, standardLabel } from "@/engine/course";

/** The crumbs' divider, with the spaces around it, so the trail reads as one line when copied. */
function Separator() {
  return <span aria-hidden="true"> › </span>;
}

/**
 * Where a session sits in the course, above its blocks: "Algebra I › Unit 2: Linear equations and
 * inequalities in one variable › Solving two-step linear equations · AI-A.REI.3", and the
 * concept's place in course order. Server-rendered.
 */
export function CourseBreadcrumb({ contentKey }: { contentKey: string }) {
  const place = conceptPlace(ALGEBRA1_COURSE, contentKey);
  if (!place) return null;
  const { unit, concept } = place;
  return (
    <nav
      aria-label="Breadcrumb"
      className="flex flex-col gap-1 text-sm text-zinc-600 dark:text-zinc-400"
    >
      <ol className="flex flex-wrap items-center">
        <li>
          {ALGEBRA1_TITLE}
          <Separator />
        </li>
        <li>
          Unit {unit.number}: {unit.title}
          <Separator />
        </li>
        <li>
          <span aria-current="page" className="font-medium text-foreground">
            {concept.title}
          </span>{" "}
          · {standardLabel(concept)}
        </li>
      </ol>
      <p>
        Concept {place.position} of {place.total}
      </p>
    </nav>
  );
}
