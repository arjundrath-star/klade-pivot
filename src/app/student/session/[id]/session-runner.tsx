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
  type SessionProgress,
} from "@/session/blocks";
import { blockBudgetSeconds, type TimerMode } from "@/session/timer";

interface ProgressState extends SessionProgress {
  markSolved: (key: string) => void;
  markLessonRead: () => void;
}

const ProgressContext = createContext<ProgressState | null>(null);

/** The session's gates as the client knows them, for the panels rendered inside the runner. */
export function useProgress(): ProgressState {
  const state = use(ProgressContext);
  if (!state) throw new Error("useProgress must be used inside SessionRunner");
  return state;
}

export const RELOAD_MESSAGE = "Something went wrong. Reload the page.";

/** What unlocks Next in a block that is not complete yet. */
function lockedMessage(block: BlockId): string {
  return block === "learn"
    ? "Go through every step, then confirm you've read it, to unlock Next."
    : "Solve every problem to unlock Next.";
}

// "moved" and "closed" have no message: the runner reloads the session from the server instead.
function moveError(error: "invalid" | "incomplete" | "first-block", block: BlockId): string {
  switch (error) {
    case "invalid":
      return RELOAD_MESSAGE;
    case "incomplete":
      return lockedMessage(block);
    case "first-block":
      return "This is the first block.";
  }
}

interface SessionRunnerProps {
  sessionId: string;
  title: string;
  initialBlock: BlockId;
  /** How long the student had already spent in `initialBlock` when the page rendered. */
  initialElapsedMs: number;
  timerMode: TimerMode;
  counts: ProblemCounts;
  initialSolved: readonly string[];
  initialLessonRead: boolean;
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
  initialLessonRead,
  panels,
}: SessionRunnerProps) {
  const router = useRouter();
  // Where the student is, and how long they had already spent there when they arrived.
  const [at, setAt] = useState<{ block: BlockId | "done"; elapsedMs: number }>({
    block: initialBlock,
    elapsedMs: initialElapsedMs,
  });
  const [solved, setSolved] = useState<ReadonlySet<string>>(() => new Set(initialSolved));
  const [lessonRead, setLessonRead] = useState(initialLessonRead);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const markSolved = (key: string) => setSolved((prev) => new Set(prev).add(key));
  const markLessonRead = () => setLessonRead(true);

  if (at.block === "done") return <SessionComplete title={title} />;
  const block = at.block;
  const position = BLOCK_IDS.indexOf(block);
  const complete = isBlockComplete(block, counts, { solved, lessonRead });
  const last = position === BLOCK_IDS.length - 1;

  const move = (direction: Direction) => {
    setError(null);
    startTransition(async () => {
      const result = await moveBlock({ sessionId, from: block, direction });
      if (!result.ok) {
        if (result.error === "moved" || result.error === "closed") router.refresh();
        else setError(moveError(result.error, block));
        return;
      }
      setAt({ block: result.to, elapsedMs: result.elapsedMs });
    });
  };

  return (
    <ProgressContext value={{ solved, lessonRead, markSolved, markLessonRead }}>
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
              className="btn-secondary"
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
            {error ?? (complete ? "" : lockedMessage(block))}
          </p>
        </footer>
      </div>
    </ProgressContext>
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
