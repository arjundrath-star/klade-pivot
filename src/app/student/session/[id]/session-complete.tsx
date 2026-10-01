import Link from "next/link";
import { inSentence } from "@/content/title";
import { EXIT_PASS_MARK, type SessionSummary } from "@/session/mastery";

interface SessionCompleteProps {
  title: string;
  /** Absent only for a session finished before verdicts were recorded. */
  summary?: SessionSummary;
}

export function SessionComplete({ title, summary }: SessionCompleteProps) {
  const mastered = summary?.outcome === "mastered";
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold tracking-tight">
        {mastered ? "Mastered" : "Session done"}
      </h1>
      {summary === undefined ? (
        <p className="text-zinc-600 dark:text-zinc-400">You finished {title}.</p>
      ) : mastered ? (
        <p className="text-zinc-600 dark:text-zinc-400">
          You got {summary.exitCorrect} of {summary.exitTotal} on the exit check and passed your
          explain-back. You have mastered {inSentence(title)}.
        </p>
      ) : (
        <>
          <p className="text-lg font-semibold">This concept repeats next session.</p>
          <p className="text-zinc-600 dark:text-zinc-400">
            You got {summary.exitCorrect} of {summary.exitTotal} on the exit check
            {summary.explainPassed ? "" : " and your explain-back did not pass"}. Mastery takes{" "}
            {EXIT_PASS_MARK} of {summary.exitTotal} and a passed explain-back.
          </p>
        </>
      )}
      <Link href="/student" className="font-medium underline underline-offset-4">
        Back to today
      </Link>
    </div>
  );
}
