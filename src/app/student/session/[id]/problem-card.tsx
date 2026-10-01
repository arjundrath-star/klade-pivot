"use client";

import dynamic from "next/dynamic";
import { useActionState, useEffect, useId, useRef } from "react";
import { submitAnswer, type AnswerResult } from "./actions";
import { NOT_A_NUMBER_MESSAGE, useProgress } from "./session-runner";
import { useCoach } from "./use-coach";
import type { SimilarExample } from "@/coach/example";
import type { CoachTurn } from "@/coach/turns";
import { problemKey, type AnsweredBlockId } from "@/session/blocks";

// The panel's code loads the first time a coach opens, so it stays out of the route's first load.
const CoachPanel = dynamic(() => import("./coach-panel").then((m) => m.CoachPanel), {
  ssr: false,
  loading: () => <p className="text-sm text-zinc-600 dark:text-zinc-400">Getting your coach…</p>,
});

interface CoachProps {
  /** The server has a model key. Without one the coach says it is offline and asks nothing. */
  available: boolean;
  example: SimilarExample;
  initialTurns: readonly CoachTurn[];
}

interface ProblemCardProps {
  sessionId: string;
  block: AnsweredBlockId;
  index: number;
  text: string;
  /** Shown under the prompt for symbolic problems. */
  equation?: string;
  /** Coached blocks only: the coach opens on a wrong answer or "I'm stuck". */
  coach?: CoachProps;
}

type Feedback = { tone: "good" | "bad" | "info"; message: string };

const SOLVED: Feedback = { tone: "good", message: "Correct." };

function feedbackFor(result: AnswerResult): Feedback {
  if (!result.ok) {
    return { tone: "info", message: "That answer didn't save. Reload the page and try again." };
  }
  switch (result.verdict) {
    case "correct":
      return SOLVED;
    case "incorrect":
      return { tone: "bad", message: "Not quite. Try again." };
    case "not-a-number":
      return { tone: "info", message: NOT_A_NUMBER_MESSAGE };
  }
}

const TONES = {
  good: "text-emerald-700 dark:text-emerald-400",
  bad: "text-red-700 dark:text-red-400",
  info: "text-zinc-600 dark:text-zinc-400",
} as const;

export function ProblemCard({ sessionId, block, index, text, equation, coach }: ProblemCardProps) {
  const { solved, markSolved } = useProgress();
  const key = problemKey(block, index);
  const isSolved = solved.has(key);
  const inputId = useId();
  const answerField = useRef<HTMLInputElement>(null);
  // Start of the current attempt: when the problem appeared, then each recorded attempt.
  const attemptStart = useRef(0);
  useEffect(() => {
    attemptStart.current = Date.now();
  }, []);
  const coachState = useCoach(sessionId, block, index, coach?.initialTurns ?? [], coach?.available);

  const [feedback, submit, pending] = useActionState(
    async (_prev: Feedback | null, form: FormData): Promise<Feedback | null> => {
      const now = Date.now();
      const answer = String(form.get("answer") ?? "").trim();
      const result = await submitAnswer({
        sessionId,
        block,
        index,
        answer,
        timeMs: now - attemptStart.current,
      });
      if (result.ok && result.verdict !== "not-a-number") attemptStart.current = now;
      // Already solved means another tab got there first; either way the problem is done.
      if (result.ok ? result.verdict === "correct" : result.error === "already-solved") {
        markSolved(key);
      }
      if (coach && result.ok && result.verdict === "incorrect") coachState.askForHelp(answer);
      return feedbackFor(result);
    },
    null,
  );

  const shown = isSolved ? SOLVED : feedback;

  return (
    <article className="flex flex-col gap-4 rounded-lg border border-zinc-200 p-5 dark:border-zinc-800">
      <p className="leading-relaxed">{text}</p>
      {equation && <p className="font-mono text-xl">{equation}</p>}
      {!isSolved && (
        <form action={submit} className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <label htmlFor={inputId} className="text-sm font-medium">
              Your answer
            </label>
            <input
              ref={answerField}
              id={inputId}
              name="answer"
              required
              autoComplete="off"
              maxLength={40}
              className="w-40 rounded-md border border-zinc-300 px-3 py-2 font-mono dark:border-zinc-700 dark:bg-zinc-900"
            />
          </div>
          <button type="submit" disabled={pending} className="btn-primary">
            Check
          </button>
          {coach && !coachState.started && (
            <button
              type="button"
              onClick={() => coachState.askForHelp(null)}
              className="btn-secondary"
            >
              I&apos;m stuck
            </button>
          )}
        </form>
      )}
      <p
        aria-live="polite"
        className={`min-h-5 text-sm font-medium ${shown ? TONES[shown.tone] : ""}`}
      >
        {shown?.message}
      </p>
      {coach && coachState.started && !isSolved && (
        <CoachPanel
          coach={coachState}
          example={coach.example}
          onTryAgain={() => answerField.current?.focus()}
        />
      )}
    </article>
  );
}
