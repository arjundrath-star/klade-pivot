import Link from "next/link";
import type { ReactNode } from "react";
import { checkInLabel, CHECK_IN_MINUTES, lastCheckInDay, nextCheckInDay } from "./check-in";
import { Badge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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

/** Words from the mentor, set off by a rule in the mentor's color, not a box of their own. */
function MentorNote({ caption, children }: { caption: string; children: ReactNode }) {
  return (
    <figure className="flex flex-col gap-2 border-l-[3px] border-mentor-deep pl-4">
      <figcaption className="text-sm font-semibold text-mentor-deep">{caption}</figcaption>
      {children}
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
    <Card aria-labelledby="mentor-heading" tone="mentor" className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start gap-4">
        <span
          aria-hidden="true"
          className="grid size-12 shrink-0 place-items-center rounded-md bg-mentor-deep font-display text-xl font-semibold text-white"
        >
          {mentor.name.charAt(0)}
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <h2 id="mentor-heading" className="font-display text-lg font-semibold">
            {kid ? "Your mentor" : `${student.name}'s mentor`}: {mentorLine(mentor)}
          </h2>
          <p className="text-ink-soft">
            Next check-in {checkInLabel(next, mentor.checkInTime)} ({CHECK_IN_MINUTES} min)
          </p>
        </div>
        <Badge tone="outline">Premium · prototype</Badge>
      </div>

      {student.viewer === "student" ? (
        <>
          <MentorNote caption={`${mentor.name}'s note`}>
            {student.explanation?.text ? (
              <>
                <p>I read your explain-back on {inSentence(student.explanation.concept)}:</p>
                <blockquote className="leading-relaxed whitespace-pre-line text-ink-soft">
                  {student.explanation.text}
                </blockquote>
                <p>{mentor.note}</p>
              </>
            ) : (
              <p>I&apos;ll read your first explain-back before we talk. {mentor.note}</p>
            )}
          </MentorNote>
          <Link href="/mentor/waiting-room" className={`${buttonClass("primary")} self-start px-6`}>
            Join the check-in
          </Link>
        </>
      ) : (
        <MentorNote
          caption={`Last check-in, ${formatDay(lastCheckInDay(mentor.checkInDay, mentor.checkInTime, now))}`}
        >
          <p>{mentor.lastSummary}</p>
        </MentorNote>
      )}
    </Card>
  );
}
