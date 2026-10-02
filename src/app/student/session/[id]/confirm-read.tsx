"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { confirmLesson } from "./actions";
import { useReveal } from "./chapter-reader";
import { RELOAD_MESSAGE, useProgress } from "./session-runner";
import { Button } from "@/components/ui/button";

interface ConfirmReadProps {
  sessionId: string;
  /** Worked examples in the chapter; the button waits until every one is revealed to the end. */
  examples: number;
}

/** The gate at the end of the chapter: the student confirms they read it, which unlocks Next. */
export function ConfirmRead({ sessionId, examples }: ConfirmReadProps) {
  const router = useRouter();
  const { lessonRead, markLessonRead } = useProgress();
  const reveal = useReveal();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const allRevealed = (reveal?.revealed.size ?? 0) >= examples;

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
    <div className="flex flex-col gap-3 border-t border-line pt-5">
      {lessonRead ? (
        <p className="font-medium text-success">Got it. Press Next to start practice.</p>
      ) : (
        <>
          <p className="text-ink-soft">
            {allRevealed
              ? "Every example is worked through. Confirm you've read the chapter to unlock Next."
              : `Step through all ${examples} worked examples, then confirm you've read the chapter.`}
          </p>
          <Button onClick={confirm} disabled={pending || !allRevealed} className="self-start">
            I&apos;ve read this
          </Button>
        </>
      )}
      {error && (
        <p role="alert" className="text-sm font-medium text-alert">
          {error}
        </p>
      )}
    </div>
  );
}
