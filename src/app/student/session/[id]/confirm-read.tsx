"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { confirmLesson } from "./actions";
import { RELOAD_MESSAGE, useProgress } from "./session-runner";
import { Button } from "@/components/ui/button";

/**
 * The gate at the end of the chapter: the student confirms they read it, which unlocks Next.
 * Stepping through the worked examples is not required.
 */
export function ConfirmRead({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const { lessonRead, markLessonRead } = useProgress();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

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
          <p className="text-ink-soft">Confirm you&apos;ve read the chapter to unlock Next.</p>
          <Button onClick={confirm} disabled={pending} className="self-start">
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
