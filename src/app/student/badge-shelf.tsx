import { BadgeItem } from "./badge-item";
import { Card } from "@/components/ui/card";
import { PanelHeader } from "@/components/ui/panel-header";
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
    <Card aria-labelledby="badges-heading" className="flex flex-col gap-4">
      <PanelHeader
        id="badges-heading"
        title={`Badges: ${have.length} of ${ALGEBRA1_BADGES.length}`}
      />
      {have.length === 0 ? (
        <p className="max-w-prose text-ink-soft">
          No badges yet. Your first comes with today&apos;s session.
        </p>
      ) : (
        <ul aria-label="Badge shelf" className="divide-y divide-line">
          {have.map((badge) => (
            <BadgeItem key={badge.key} label={badge.label} detail={badge.detail} />
          ))}
        </ul>
      )}
      {next && (
        <p className="text-sm text-ink-soft">
          Next up: {next.label}. {next.detail}
        </p>
      )}
    </Card>
  );
}
