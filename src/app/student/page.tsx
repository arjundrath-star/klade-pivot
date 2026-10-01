import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { startTodaySession } from "./actions";
import { ProgressPanel } from "./progress-panel";
import { inSentence } from "@/content/title";
import { studentEarnings } from "@/db/queries/rewards";
import { findTodaySession } from "@/db/queries/sessions";
import { getStudent } from "@/db/queries/students";
import { currentStudentId } from "@/session/current-student";
import { studentStanding } from "@/session/pace";

export const metadata: Metadata = { title: "Today · Klade" };

export default async function StudentHome() {
  // Reads the database, so it renders per request, never at build time.
  await connection();
  const studentId = await currentStudentId();
  const [student, today, standing, earnings] = await Promise.all([
    getStudent(studentId),
    findTodaySession(studentId),
    studentStanding(studentId, new Date()),
    studentEarnings(studentId),
  ]);

  return (
    <div className="flex flex-col gap-8">
      {student ? (
        <>
          <h1 className="text-3xl font-semibold tracking-tight">Hi, {student.name}</h1>
          <section
            aria-labelledby="today-heading"
            className="flex flex-col gap-4 rounded-lg border border-zinc-200 p-6 dark:border-zinc-800"
          >
            <h2
              id="today-heading"
              className="text-sm font-medium tracking-wide text-zinc-600 uppercase dark:text-zinc-400"
            >
              Today&apos;s session
            </h2>
            {today.kind === "complete" ? (
              <p className="text-lg">Every session in this unit is done.</p>
            ) : (
              <>
                <p className="text-xl font-semibold">
                  {today.repeat ? `Today: repeat ${inSentence(today.title)}` : today.title}
                </p>
                {today.repeat && (
                  <p className="text-zinc-600 dark:text-zinc-400">
                    Last time didn&apos;t reach mastery, so this concept comes again before anything
                    new.
                  </p>
                )}
                <p className="text-zinc-600 dark:text-zinc-400">
                  About 30 minutes: warm-up, lesson, guided practice, explain-back, exit check.
                </p>
                <form action={startTodaySession}>
                  <button type="submit" className="btn-primary">
                    {today.kind === "open" ? "Resume" : "Start"}
                  </button>
                </form>
              </>
            )}
          </section>
          <ProgressPanel
            xp={earnings.xp}
            streak={standing.streak}
            mastered={earnings.mastered}
            earned={earnings.badges}
          />
        </>
      ) : (
        <p>
          No student yet.{" "}
          <Link href="/onboarding" className="underline">
            Set one up
          </Link>
          , or run npm run db:seed to add the demo student.
        </p>
      )}
    </div>
  );
}
