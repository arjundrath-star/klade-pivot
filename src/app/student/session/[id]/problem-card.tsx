"use client";

import dynamic from "next/dynamic";
import { useActionState, useEffect, useId, useRef, useState, useTransition } from "react";
import { skipProblem, submitAnswer, type AnswerResult, type SkipResult } from "./actions";
import { answerInputClass, Equation } from "./equation";
import { NOT_A_NUMBER_MESSAGE, useProgress } from "./session-runner";
import { useCoach } from "./use-coach";
import type { SimilarExample } from "@/coach/example";
import type { CoachTurn } from "@/coach/turns";
import { Button } from "@/components/ui/button";
import { problemKey, type AnsweredBlockId } from "@/session/blocks";

// The panel's code loads the first time a coach opens, so it stays out of the route's first load.
const CoachPanel = dynamic(() => import("./coach-panel").then((m) => m.CoachPanel), {
  ssr: false,
  loading: () => <p className="text-sm text-ink-soft">Getting your coach…</p>,
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
  /** The browser is signed in at the gate, so the demo's "Skip (demo)" shows. */
  skippable: boolean;
  /** Coached blocks only: the coach opens on a wrong answer or "I'm stuck". */
  coach?: CoachProps;
}

type Feedback = { tone: "good" | "bad" | "info"; message: string };

const SOLVED: Feedback = { tone: "good", message: "Correct." };

const SKIPPED: Feedback = { tone: "info", message: "Skipped for the demo. It earns nothing." };

function skipFeedback(error: Extract<SkipResult, { ok: false }>["error"]): Feedback {
  return error === "refused"
    ? { tone: "info", message: "Skipping is for a signed-in demo only." }
    : { tone: "info", message: "That skip didn't save. Reload the page and try again." };
}

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
  good: "text-success",
  bad: "text-alert",
  info: "text-ink-soft",
} as const;

export function ProblemCard({
  sessionId,
  block,
  index,
  text,
  equation,
  skippable,
  coach,
}: ProblemCardProps) {
  const { solved, skipped, markSolved, markSkipped } = useProgress();
  const key = problemKey(block, index);
  const isSolved = solved.has(key);
  const isSkipped = !isSolved && skipped.has(key);
  const settled = isSolved || isSkipped;
  const [skipNote, setSkipNote] = useState<Feedback | null>(null);
  const [skipping, startSkip] = useTransition();
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
      setSkipNote(null);
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
      // Already solved or skipped means another tab got there first; either way it is settled.
      if (result.ok ? result.verdict === "correct" : result.error === "already-solved") {
        markSolved(key);
      }
      if (!result.ok && result.error === "skipped") markSkipped(key);
      if (coach && result.ok && result.verdict === "incorrect") coachState.askForHelp(answer);
      return feedbackFor(result);
    },
    null,
  );

  const skip = () => {
    startSkip(async () => {
      const result = await skipProblem({
        sessionId,
        block,
        index,
        timeMs: Date.now() - attemptStart.current,
      });
      if (result.ok || result.error === "skipped") markSkipped(key);
      else if (result.error === "already-solved") markSolved(key);
      else setSkipNote(skipFeedback(result.error));
    });
  };

  const shown = isSolved ? SOLVED : isSkipped ? SKIPPED : (skipNote ?? feedback);

  return (
    <article aria-label="Problem" className="flex flex-col gap-5">
      <p className="text-lg leading-relaxed">{text}</p>
      {equation && <Equation>{equation}</Equation>}
      {!settled && (
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
              className={answerInputClass}
            />
          </div>
          <Button type="submit" disabled={pending}>
            Check
          </Button>
          {coach && !coachState.started && (
            <Button variant="secondary" onClick={() => coachState.askForHelp(null)}>
              I&apos;m stuck
            </Button>
          )}
          {skippable && (
            <Button
              variant="demo"
              size="sm"
              onClick={skip}
              disabled={pending || skipping}
              className="ml-auto"
            >
              Skip (demo)
            </Button>
          )}
        </form>
      )}
      <p
        aria-live="polite"
        className={`min-h-5 text-sm font-medium ${shown ? TONES[shown.tone] : ""}`}
      >
        {shown?.message}
      </p>
      {coach && coachState.started && !settled && (
        <CoachPanel
          coach={coachState}
          example={coach.example}
          onTryAgain={() => answerField.current?.focus()}
        />
      )}
    </article>
  );
}
