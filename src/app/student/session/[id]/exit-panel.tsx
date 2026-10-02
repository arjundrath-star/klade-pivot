"use client";

import { useEffect, useEffectEvent, useId, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { submitExitAnswer } from "./actions";
import { answerInputClass } from "./equation";
import { NOT_A_NUMBER_MESSAGE } from "./session-runner";
import { Button } from "@/components/ui/button";
import { formatClock } from "@/session/timer";

interface CountdownProps {
  remainingMs: number;
  onExpire: () => void;
}

function secondsLeft(ms: number): number {
  return Math.max(0, Math.ceil(ms / 1000));
}

/** Counts down the time left on one exit-check problem. Display only: the server keeps the time. */
function Countdown({ remainingMs, onExpire }: CountdownProps) {
  const [seconds, setSeconds] = useState(() => secondsLeft(remainingMs));
  const expire = useEffectEvent(onExpire);

  useEffect(() => {
    const mountedAt = Date.now();
    // Ticks often enough to turn over close to each second; React skips the render when the whole
    // seconds have not changed.
    const tick = setInterval(
      () => setSeconds(secondsLeft(remainingMs - (Date.now() - mountedAt))),
      250,
    );
    const deadline = setTimeout(() => expire(), Math.max(0, remainingMs));
    return () => {
      clearInterval(tick);
      clearTimeout(deadline);
    };
  }, [remainingMs]);

  return (
    <p
      role="timer"
      aria-label="Time left on this problem"
      className={`font-display text-xl font-semibold tabular-nums ${seconds <= 10 ? "text-alert" : ""}`}
    >
      {formatClock(seconds)} left
    </p>
  );
}

interface ExitPanelProps {
  sessionId: string;
  index: number;
  /** Time left on the problem when the server rendered it; null for an untimed student. */
  remainingMs: number | null;
}

/**
 * The answer field for one exit-check problem. It takes one answer; when the countdown runs out it
 * sends what is typed as an expired answer, which the server records as incorrect.
 */
export function ExitPanel({ sessionId, index, remainingMs }: ExitPanelProps) {
  const router = useRouter();
  const inputId = useId();
  const field = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const send = (expired: boolean) => {
    setMessage(null);
    const answer = field.current?.value.trim() ?? "";
    startTransition(async () => {
      const result = await submitExitAnswer({ sessionId, index, answer, expired });
      if (result.ok && result.verdict === "not-a-number") {
        setMessage(NOT_A_NUMBER_MESSAGE);
        return;
      }
      // Recorded, here or in another tab: the server renders the next problem, or unlocks Finish.
      router.refresh();
    });
  };

  return (
    <div className="flex flex-col gap-3">
      {remainingMs !== null && <Countdown remainingMs={remainingMs} onExpire={() => send(true)} />}
      <form
        onSubmit={(event) => {
          event.preventDefault();
          send(false);
        }}
        className="flex flex-wrap items-end gap-3"
      >
        <div className="flex flex-col gap-1">
          <label htmlFor={inputId} className="text-sm font-medium">
            Your answer
          </label>
          <input
            ref={field}
            id={inputId}
            name="answer"
            required
            autoComplete="off"
            maxLength={40}
            className={answerInputClass}
          />
        </div>
        <Button type="submit" disabled={pending}>
          Submit
        </Button>
      </form>
      <p aria-live="polite" className="min-h-5 text-sm font-medium text-ink-soft">
        {message}
      </p>
    </div>
  );
}
