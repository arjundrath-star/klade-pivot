"use client";

import { createContext, use, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { BlockTimer } from "./block-timer";
import { moveBlock } from "./actions";
import { SessionComplete } from "./session-complete";
import {
  BLOCK_IDS,
  BLOCKS,
  isBlockComplete,
  type BlockId,
  type Direction,
  type ProblemCounts,
} from "@/session/blocks";
import { blockBudgetSeconds, type TimerMode } from "@/session/timer";

interface SolvedState {
  solved: ReadonlySet<string>;
  markSolved: (key: string) => void;
}

const SolvedContext = createContext<SolvedState | null>(null);

/** Which problems are solved, for the problem cards rendered inside the runner. */
export function useSolved(): SolvedState {
  const state = use(SolvedContext);
  if (!state) throw new Error("useSolved must be used inside SessionRunner");
  return state;
}

// "moved" and "closed" have no message: the runner reloads the session from the server instead.
const MOVE_ERRORS: Record<"invalid" | "incomplete" | "first-block", string> = {
  invalid: "Something went wrong. Reload the page.",
  incomplete: "Solve every problem to move on.",
  "first-block": "This is the first block.",
};

interface SessionRunnerProps {
  sessionId: string;
  title: string;
  initialBlock: BlockId;
  /** How long the student had already spent in `initialBlock` when the page rendered. */
  initialElapsedMs: number;
  timerMode: TimerMode;
  counts: ProblemCounts;
  initialSolved: readonly string[];
  /** Each block's panel, rendered on the server. */
  panels: Readonly<Record<BlockId, ReactNode>>;
}

export function SessionRunner({
  sessionId,
  title,
  initialBlock,
  initialElapsedMs,
  timerMode,
  counts,
  initialSolved,
  panels,
}: SessionRunnerProps) {
  const router = useRouter();
  // Where the student is, and how long they had already spent there when they arrived.
  const [at, setAt] = useState<{ block: BlockId | "done"; elapsedMs: number }>({
    block: initialBlock,
    elapsedMs: initialElapsedMs,
  });
  const [solved, setSolved] = useState<ReadonlySet<string>>(() => new Set(initialSolved));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const markSolved = (key: string) => setSolved((prev) => new Set(prev).add(key));

  if (at.block === "done") return <SessionComplete title={title} />;
  const block = at.block;
  const position = BLOCK_IDS.indexOf(block);
  const complete = isBlockComplete(block, counts, solved);
  const last = position === BLOCK_IDS.length - 1;

  const move = (direction: Direction) => {
    setError(null);
    startTransition(async () => {
      const result = await moveBlock({ sessionId, from: block, direction });
      if (!result.ok) {
        if (result.error === "moved" || result.error === "closed") router.refresh();
        else setError(MOVE_ERRORS[result.error]);
        return;
      }
      setAt({ block: result.to, elapsedMs: result.elapsedMs });
    });
  };

  return (
    <SolvedContext value={{ solved, markSolved }}>
      <div className="flex flex-col gap-8">
        <header className="flex flex-col gap-4">
          <div className="flex items-baseline justify-between gap-4">
            <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
            <BlockTimer
              key={block}
              budgetSeconds={blockBudgetSeconds(block, timerMode)}
              elapsedAtEntryMs={at.elapsedMs}
            />
          </div>
          <ProgressBar position={position} />
        </header>

        <section aria-labelledby="block-heading" className="flex flex-col gap-6">
          <h2 id="block-heading" className="text-lg font-semibold">
            {BLOCKS[block].label}
          </h2>
          {panels[block]}
        </section>

        <footer className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={() => move("back")}
              disabled={position === 0 || pending}
              className="rounded-md border border-zinc-300 px-4 py-2 font-medium disabled:opacity-40 dark:border-zinc-700"
            >
              Back
            </button>
            <button
              type="button"
              onClick={() => move("next")}
              disabled={!complete || pending}
              className="btn-primary"
            >
              {last ? "Finish" : "Next"}
            </button>
          </div>
          <p aria-live="polite" className="min-h-5 text-sm text-zinc-600 dark:text-zinc-400">
            {error ?? (complete ? "" : "Solve every problem to unlock Next.")}
          </p>
        </footer>
      </div>
    </SolvedContext>
  );
}

function ProgressBar({ position }: { position: number }) {
  return (
    <div
      role="progressbar"
      aria-label="Session progress"
      aria-valuemin={1}
      aria-valuemax={BLOCK_IDS.length}
      aria-valuenow={position + 1}
      aria-valuetext={`Block ${position + 1} of ${BLOCK_IDS.length}: ${BLOCKS[BLOCK_IDS[position]].label}`}
    >
      <ol className="grid grid-cols-5 gap-2">
        {BLOCK_IDS.map((id, i) => (
          <li key={id} className="flex flex-col gap-1.5">
            <span
              className={`h-1.5 rounded-full ${i <= position ? "bg-zinc-900 dark:bg-zinc-100" : "bg-zinc-200 dark:bg-zinc-800"}`}
            />
            <span
              className={`text-xs ${i === position ? "font-semibold" : "text-zinc-600 dark:text-zinc-400"}`}
            >
              {BLOCKS[id].label}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
