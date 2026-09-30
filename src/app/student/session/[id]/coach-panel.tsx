"use client";

import { useState } from "react";
import { StepList } from "./step-list";
import type { CoachState } from "./use-coach";
import type { SimilarExample } from "@/coach/example";
import { MAX_HINT_LEVEL } from "@/coach/turns";

interface CoachPanelProps {
  coach: CoachState;
  example: SimilarExample;
  /** Puts the student back in the answer field. */
  onTryAgain: () => void;
}

/** The Socratic coach for one problem: the turns so far, a reply box, then the worked example. */
export function CoachPanel({ coach, example, onTryAgain }: CoachPanelProps) {
  const { turns, live, busy, error, exhausted } = coach;
  const [draft, setDraft] = useState("");
  const shown = live ? [...turns, live] : turns;

  const send = () => {
    const message = draft.trim();
    if (message === "") return;
    setDraft("");
    coach.reply(message);
  };

  return (
    <aside
      aria-label="Coach"
      className="flex flex-col gap-4 rounded-lg border border-zinc-300 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-900"
    >
      <div className="flex items-baseline justify-between gap-4">
        <h3 className="font-semibold">Coach</h3>
        {shown.length > 0 && (
          <span className="text-sm text-zinc-600 dark:text-zinc-400">
            Hint {shown.length} of {MAX_HINT_LEVEL}
          </span>
        )}
      </div>
      <ol aria-live="polite" className="flex flex-col gap-3">
        {shown.map((turn) => (
          <li key={turn.level} className="flex flex-col gap-1">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">You: {turn.student}</p>
            <p className="leading-relaxed whitespace-pre-line">{turn.coach || "…"}</p>
          </li>
        ))}
      </ol>
      {exhausted ? (
        <div className="flex flex-col gap-3">
          <p>
            That was the last hint. Here is a problem like yours, with other numbers, worked out:
          </p>
          <p className="leading-relaxed">{example.text}</p>
          <p className="font-mono text-xl">{example.equation}</p>
          <StepList label="Example steps" steps={example.steps} />
          <p>Now do the same steps with your numbers.</p>
        </div>
      ) : (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            send();
          }}
          className="flex flex-wrap items-end gap-3"
        >
          <label className="flex grow flex-col gap-1">
            <span className="text-sm font-medium">Reply to your coach</span>
            <input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              disabled={busy}
              maxLength={300}
              autoComplete="off"
              placeholder="What have you tried?"
              className="rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950"
            />
          </label>
          <button type="submit" disabled={busy || draft.trim() === ""} className="btn-primary">
            Send
          </button>
        </form>
      )}
      <div className="flex flex-wrap items-center gap-4">
        <button type="button" onClick={onTryAgain} className="btn-secondary">
          Try again
        </button>
        {error && (
          <p role="alert" className="text-sm font-medium text-red-700 dark:text-red-400">
            {error}
          </p>
        )}
      </div>
    </aside>
  );
}
