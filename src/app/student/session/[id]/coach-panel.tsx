"use client";

import { useState } from "react";
import { Equation } from "./equation";
import { StepList } from "./step-list";
import type { CoachState } from "./use-coach";
import type { SimilarExample } from "@/coach/example";
import { MAX_HINT_LEVEL } from "@/coach/turns";
import { Button } from "@/components/ui/button";
import { cardClass } from "@/components/ui/card";
import { inputClass } from "@/components/ui/field";
import { AppGlyph } from "@/phone/apps";

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
      className={`${cardClass("course", "xs")} flex flex-col gap-4 rounded-md`}
    >
      <div className="flex items-center justify-between gap-4">
        <h3 className="flex items-center gap-2 font-display text-lg font-semibold">
          <span className="grid size-7 shrink-0 place-items-center rounded-full bg-course text-ink">
            <AppGlyph name="bubble" className="size-4" />
          </span>
          Coach
        </h3>
        {shown.length > 0 && (
          <span className="text-sm text-ink-soft">
            Hint {shown.length} of {MAX_HINT_LEVEL}
          </span>
        )}
      </div>
      <ol aria-live="polite" className="flex flex-col gap-3">
        {shown.map((turn) => (
          <li key={turn.level} className="flex flex-col gap-1">
            <p className="text-sm text-ink-soft">You: {turn.student}</p>
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
          <Equation>{example.equation}</Equation>
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
              className={`${inputClass} w-full`}
            />
          </label>
          <Button type="submit" disabled={busy || draft.trim() === ""}>
            Send
          </Button>
        </form>
      )}
      <div className="flex flex-wrap items-center gap-4">
        <Button variant="secondary" size="sm" onClick={onTryAgain}>
          Try again
        </Button>
        {error && (
          <p role="alert" className="text-sm font-medium text-alert">
            {error}
          </p>
        )}
      </div>
    </aside>
  );
}
