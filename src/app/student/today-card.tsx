import { startTodaySession } from "./actions";
import { ALGEBRA1_COURSE, ALGEBRA1_TITLE } from "@/content/algebra1/course";
import { inSentence } from "@/content/title";
import type { TodaySession } from "@/db/queries/sessions";
import { standardLabel, type CoursePlace } from "@/engine/course";
import { SESSION_MINUTES } from "@/engine/pace";
import { openMessage } from "@/phone/messages";
import type { LockView } from "@/session/lock-status";

interface TodayCardProps {
  today: TodaySession;
  /** Where today's concept sits in the course; undefined when it is not on the map. */
  place: CoursePlace | undefined;
  /** The first concept not yet mastered, built or not, for when nothing playable is left. */
  next: CoursePlace | undefined;
  phone: LockView;
  className?: string;
}

/** The phone's state in one line: locked for this session, or what the phone's screen says. */
function phoneLine(phone: LockView): string {
  return `Phone: ${phone.locked ? "locked until this session is done." : openMessage(phone)}`;
}

/**
 * Today's session: the unit, the concept, its standard and length, Start, and the phone in one
 * line. Once every built session is done it says what comes next in the course and that it is
 * not built yet.
 */
export function TodayCard({ today, place, next, phone, className = "" }: TodayCardProps) {
  return (
    <section
      id="today"
      aria-labelledby="today-heading"
      className={`flex flex-col gap-4 rounded-[1.75rem] bg-dusk p-7 text-white shadow-[0_28px_56px_-28px_rgba(27,24,56,0.7)] ${className}`}
    >
      <h2 id="today-heading" className="text-sm font-medium text-white/70">
        Today&apos;s session
      </h2>
      {today.kind === "complete" ? (
        <div className="flex flex-col gap-3">
          <p className="font-display text-3xl leading-tight font-semibold">
            Every built session is done.
          </p>
          <p className="text-white/80">
            {next
              ? `Next in the course: ${next.concept.title} (${standardLabel(next.concept)}), concept ${next.position} of ${next.total}. It isn't built yet.`
              : `You finished ${ALGEBRA1_TITLE}.`}
          </p>
        </div>
      ) : (
        <>
          {place && (
            <p className="text-sm text-white/70">
              Unit {place.unit.number} of {ALGEBRA1_COURSE.length}: {place.unit.title}
            </p>
          )}
          <p className="font-display text-3xl leading-tight font-semibold sm:text-4xl">
            {today.repeat ? `Today: repeat ${inSentence(today.title)}` : today.title}
          </p>
          {today.repeat && (
            <p className="text-white/80">
              Last time didn&apos;t reach mastery, so this concept comes again before anything new.
            </p>
          )}
          <p className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-white/80">
            {place && (
              <>
                <span>Standard {standardLabel(place.concept)}</span>
                <span>
                  Concept {place.position} of {place.total}
                </span>
              </>
            )}
            <span>{SESSION_MINUTES} minutes</span>
          </p>
          <p className="text-sm text-white/70">
            Warm-up, lesson, guided practice, explain-back, exit check.
          </p>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-3 pt-1">
            <form action={startTodaySession}>
              <button
                type="submit"
                className="rounded-full bg-marigold px-7 py-2.5 text-base font-semibold text-dusk focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                {today.kind === "open" ? "Resume" : "Start"}
              </button>
            </form>
            <p className="text-sm text-white/85">{phoneLine(phone)}</p>
          </div>
        </>
      )}
    </section>
  );
}
