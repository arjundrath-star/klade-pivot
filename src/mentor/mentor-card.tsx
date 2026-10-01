import Link from "next/link";
import { checkInLabel, CHECK_IN_MINUTES, lastCheckInDay, nextCheckInDay } from "./check-in";
import { inSentence } from "@/content/title";
import type { mentorFor } from "@/db/queries/mentor";
import type { latestExplanation } from "@/db/queries/parent";
import { formatDay } from "@/parent/progress";

type Mentor = NonNullable<Awaited<ReturnType<typeof mentorFor>>>;

/** The student's latest explain-back, from the parent view's query. Override rows have no text. */
type Explanation = Pick<
  NonNullable<Awaited<ReturnType<typeof latestExplanation>>>,
  "concept" | "text"
>;

interface MentorCardProps {
  mentor: Mentor;
  now: Date;
  student:
    | { viewer: "student"; explanation: Explanation | undefined }
    | { viewer: "parent"; name: string };
}

/** "Jordan · NYU '28". */
function mentorLine({ name, school, classYear }: Mentor): string {
  return `${name} · ${school} '${String(classYear % 100).padStart(2, "0")}`;
}

function KidNote({
  mentor,
  explanation,
}: {
  mentor: Mentor;
  explanation: Explanation | undefined;
}) {
  return (
    <figure className="flex flex-col gap-2 rounded-2xl bg-dusk/5 p-4 dark:bg-white/5">
      <figcaption className="text-sm font-medium">{mentor.name}&apos;s note</figcaption>
      {explanation?.text ? (
        <>
          <p>I read your explain-back on {inSentence(explanation.concept)}:</p>
          <blockquote className="border-l-[3px] border-marigold pl-3 leading-relaxed whitespace-pre-line">
            {explanation.text}
          </blockquote>
          <p>{mentor.note}</p>
        </>
      ) : (
        <p>I&apos;ll read your first explain-back before we talk. {mentor.note}</p>
      )}
    </figure>
  );
}

/**
 * The college-student mentor's card on the kid's and the parent's views (steering §3.3). The kid's
 * note quotes their latest explain-back word for word; everything else is seeded. Premium
 * prototype: no booking or video behind it.
 */
export function MentorCard({ mentor, now, student }: MentorCardProps) {
  const next = nextCheckInDay(mentor.checkInDay, mentor.checkInTime, now);
  const kid = student.viewer === "student";
  return (
    <section
      aria-labelledby="mentor-heading"
      className="flex flex-col gap-4 rounded-[1.75rem] border border-dusk/12 bg-white p-6 shadow-[0_20px_44px_-30px_rgba(27,24,56,0.55)] dark:border-white/10 dark:bg-zinc-900"
    >
      <div className="flex flex-wrap items-start gap-4">
        <span
          aria-hidden="true"
          className="grid size-12 shrink-0 place-items-center rounded-[0.85rem] bg-dusk text-xl font-semibold text-marigold dark:ring-1 dark:ring-white/15"
        >
          {mentor.name.charAt(0)}
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <h2 id="mentor-heading" className="text-lg font-semibold">
            {kid ? "Your mentor" : `${student.name}'s mentor`}: {mentorLine(mentor)}
          </h2>
          <p className="text-zinc-600 dark:text-zinc-400">
            Next check-in {checkInLabel(next, mentor.checkInTime)} ({CHECK_IN_MINUTES} min)
          </p>
        </div>
        <p className="rounded-full bg-marigold/25 px-2.5 py-0.5 text-xs font-medium text-dusk dark:bg-marigold/15 dark:text-marigold">
          Premium · prototype
        </p>
      </div>

      {student.viewer === "student" ? (
        <>
          <KidNote mentor={mentor} explanation={student.explanation} />
          <Link
            href="/mentor/waiting-room"
            className="self-start rounded-full bg-dusk px-5 py-2 font-semibold text-white outline-offset-2 focus-visible:outline-2 dark:bg-marigold dark:text-dusk"
          >
            Join
          </Link>
        </>
      ) : (
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
            Last check-in, {formatDay(lastCheckInDay(mentor.checkInDay, mentor.checkInTime, now))}
          </p>
          <p>{mentor.lastSummary}</p>
        </div>
      )}
    </section>
  );
}
