"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { confirmLesson } from "./actions";
import { RELOAD_MESSAGE, useProgress } from "./session-runner";
import type { LessonStep } from "@/content/lesson";

interface WorkedExampleProps {
  sessionId: string;
  equation: string;
  steps: readonly LessonStep[];
}

/** Reveals the example one step per click, then asks the student to confirm they read it. */
export function WorkedExample({ sessionId, equation, steps }: WorkedExampleProps) {
  const router = useRouter();
  const { lessonRead, markLessonRead } = useProgress();
  const [revealed, setRevealed] = useState(lessonRead ? steps.length : 0);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const allRevealed = revealed === steps.length;

  const confirm = () => {
    setError(null);
    startTransition(async () => {
      const result = await confirmLesson({ sessionId });
      if (result.ok) markLessonRead();
      // The session moved on in another tab: reload it from the server.
      else if (result.error === "closed") router.refresh();
      else setError(RELOAD_MESSAGE);
    });
  };

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-zinc-200 p-5 dark:border-zinc-800">
      <h3 className="font-semibold">Worked example</h3>
      <p className="font-mono text-xl">{equation}</p>
      <ol aria-label="Steps" aria-live="polite" className="flex flex-col gap-4">
        {steps.slice(0, revealed).map((step, i) => (
          <li
            key={step.label}
            className="flex flex-col gap-1 border-l-2 border-zinc-300 pl-4 dark:border-zinc-700"
          >
            <p className="text-sm font-semibold">
              Step {i + 1}. {step.label}
            </p>
            <p className="font-mono text-lg">{step.equation}</p>
            <p className="text-zinc-600 dark:text-zinc-400">{step.reason}</p>
          </li>
        ))}
      </ol>
      {lessonRead ? (
        <p className="font-medium text-emerald-700 dark:text-emerald-400">
          Got it. Press Next to start practice.
        </p>
      ) : (
        // One button that changes job keeps keyboard focus in place from the first step to the end.
        <button
          type="button"
          onClick={allRevealed ? confirm : () => setRevealed(revealed + 1)}
          disabled={pending}
          className="btn-primary self-start"
        >
          {allRevealed
            ? "I've read this"
            : revealed === 0
              ? "Show the first step"
              : "Show the next step"}
        </button>
      )}
      {error && (
        <p role="alert" className="text-sm font-medium text-red-700 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
