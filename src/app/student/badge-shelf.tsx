import { ALGEBRA1_BADGES } from "@/content/algebra1/badges";
import { conceptBadgeKey } from "@/engine/progress";

interface BadgeShelfProps {
  /** Keys of the badges the student has earned. */
  earned: ReadonlySet<string>;
  /** The concept of today's session, whose badge is the next one to earn. */
  currentKey: string | null;
}

/**
 * The badges earned so far, in shelf order, with the count against the course's whole shelf and
 * the next badge to earn: today's concept, else the first one not yet earned.
 */
export function BadgeShelf({ earned, currentKey }: BadgeShelfProps) {
  const have = ALGEBRA1_BADGES.filter((badge) => earned.has(badge.key));
  const todays = currentKey === null ? undefined : conceptBadgeKey(currentKey);
  const next =
    ALGEBRA1_BADGES.find((badge) => badge.key === todays && !earned.has(badge.key)) ??
    ALGEBRA1_BADGES.find((badge) => !earned.has(badge.key));
  return (
    <section aria-labelledby="badges-heading" className="card flex flex-col gap-4">
      <h2 id="badges-heading" className="font-display text-xl font-semibold">
        Badges: {have.length} of {ALGEBRA1_BADGES.length}
      </h2>
      {have.length === 0 ? (
        <p className="text-zinc-600 dark:text-zinc-400">
          No badges yet. Your first comes with today&apos;s session.
        </p>
      ) : (
        <ul aria-label="Badge shelf" className="flex flex-col gap-2">
          {have.map((badge) => (
            <li
              key={badge.key}
              className="flex flex-col rounded-xl bg-marigold/20 px-3 py-2 dark:bg-marigold/15"
            >
              <span className="font-semibold">{badge.label}</span>
              <span className="text-sm text-zinc-700 dark:text-zinc-300">{badge.detail}</span>
            </li>
          ))}
        </ul>
      )}
      {next && (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Next up: {next.label}. {next.detail}
        </p>
      )}
    </section>
  );
}
