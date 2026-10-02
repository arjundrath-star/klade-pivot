import { startTodaySession } from "./actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ALGEBRA1_COURSE, ALGEBRA1_TITLE } from "@/content/algebra1/course";
import { inSentence } from "@/content/title";
import type { TodaySession } from "@/db/queries/sessions";
import { standardLabel, type CoursePlace } from "@/engine/course";
import { SESSION_MINUTES } from "@/engine/pace";
import { AppGlyph } from "@/phone/apps";
import { openMessage } from "@/phone/messages";
import type { LockView } from "@/session/lock-status";

interface TodayCardProps {
  today: TodaySession;
  /** Where today's concept sits in the course; undefined when it is not on the map. */
  place: CoursePlace | undefined;
  /** The first concept not yet mastered, built or not, for when nothing playable is left. */
  next: CoursePlace | undefined;
  /** When the session is due: today at the session time, or the next session day. */
  due?: string;
  phone: LockView;
}

/** The phone's state in one line: locked for this session, or what the phone's screen says. */
function phoneLine(phone: LockView): string {
  return `Phone: ${phone.locked ? "locked until this session is done." : openMessage(phone)}`;
}

/**
 * Today's session, first on the page: when it is due, the unit, the concept, its standard and
 * length, Start, and the phone in one line. Once every built session is done it says what comes
 * next in the course and that it is not built yet.
 */
export function TodayCard({ today, place, next, due, phone }: TodayCardProps) {
  return (
    <Card id="today" aria-labelledby="today-heading" tone="today" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 id="today-heading" className="text-sm font-semibold text-today-deep">
          Today&apos;s session
        </h2>
        {due && <p className="text-sm font-medium">{due}</p>}
      </div>
      {today.kind === "complete" ? (
        <div className="flex flex-col gap-3">
          <p className="font-display text-3xl leading-tight font-semibold">
            Every built session is done.
          </p>
          <p className="max-w-prose text-ink-soft">
            {next
              ? `Next in the course: ${next.concept.title} (${standardLabel(next.concept)}), concept ${next.position} of ${next.total}. It isn't built yet.`
              : `You finished ${ALGEBRA1_TITLE}.`}
          </p>
        </div>
      ) : (
        <>
          {place && (
            <p className="text-sm text-ink-soft">
              Unit {place.unit.number} of {ALGEBRA1_COURSE.length}: {place.unit.title}
            </p>
          )}
          <p className="font-display text-3xl leading-tight font-semibold">
            {today.repeat ? `Today: repeat ${inSentence(today.title)}` : today.title}
          </p>
          {today.repeat && (
            <p className="max-w-prose text-ink-soft">
              Last time didn&apos;t reach mastery, so this concept comes again before anything new.
            </p>
          )}
          <p className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-ink-soft">
            {place && (
              <>
                <span>Standard {standardLabel(place.concept)}</span>
                <span className="tabular-nums">
                  Concept {place.position} of {place.total}
                </span>
              </>
            )}
            <span>
              {SESSION_MINUTES} minutes: warm-up, lesson, guided practice, explain-back, exit check
            </span>
          </p>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-3 pt-1">
            <form action={startTodaySession}>
              <Button type="submit" className="px-6">
                {today.kind === "open" ? "Resume today's session" : "Start today's session"}
              </Button>
            </form>
            <p className="flex items-center gap-1.5 text-sm font-medium">
              <AppGlyph name={phone.locked ? "lock" : "open"} className="size-4 shrink-0" />
              {phoneLine(phone)}
            </p>
          </div>
        </>
      )}
    </Card>
  );
}
