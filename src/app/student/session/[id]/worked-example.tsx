"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { confirmLesson } from "./actions";
import { Equation } from "./equation";
import { RELOAD_MESSAGE, useProgress } from "./session-runner";
import { StepList } from "./step-list";
import { Button } from "@/components/ui/button";
import { cardClass } from "@/components/ui/card";
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
    <div className={`${cardClass()} flex flex-col gap-4`}>
      <h3 className="font-display text-lg font-semibold">Worked example</h3>
      <Equation>{equation}</Equation>
      <StepList label="Steps" live steps={steps.slice(0, revealed)} />
      {lessonRead ? (
        <p className="font-medium text-success">Got it. Press Next to start practice.</p>
      ) : (
        // One button that changes job keeps keyboard focus in place from the first step to the end.
        <Button
          onClick={allRevealed ? confirm : () => setRevealed(revealed + 1)}
          disabled={pending}
          className="self-start"
        >
          {allRevealed
            ? "I've read this"
            : revealed === 0
              ? "Show the first step"
              : "Show the next step"}
        </Button>
      )}
      {error && (
        <p role="alert" className="text-sm font-medium text-alert">
          {error}
        </p>
      )}
    </div>
  );
}
