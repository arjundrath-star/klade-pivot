"use client";

import { createContext, use, useState, useTransition, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { BlockTimer } from "./block-timer";
import { loadExitPanel } from "./exit-check";
import { loadExplainPanel } from "./explain-back";
import { moveBlock, type MoveError } from "./actions";
import type { ExplainStatus } from "@/coach/rubric";
import { Button } from "@/components/ui/button";
import {
  BLOCK_IDS,
  BLOCKS,
  isBlockComplete,
  type BlockId,
  type Direction,
  type ProblemCounts,
  type SessionProgress,
} from "@/session/blocks";
import type { SessionSummary } from "@/session/complete";
import { blockBudgetSeconds, type TimerMode } from "@/session/timer";

// The end screen shows only once the exit check is finished, so its code stays out of the route's
// first load. Finish starts the download while the server adds up the session.
const loadSessionComplete = () => import("./session-complete");

const SessionComplete = dynamic(() => loadSessionComplete().then((m) => m.SessionComplete), {
  loading: () => <p className="text-sm text-ink-soft">Adding up your session…</p>,
});

interface ProgressState extends SessionProgress {
  markSolved: (key: string) => void;
  markLessonRead: () => void;
  setExplainBack: (status: ExplainStatus) => void;
}

const ProgressContext = createContext<ProgressState | null>(null);

/** The session's gates as the client knows them, for the panels rendered inside the runner. */
export function useProgress(): ProgressState {
  const state = use(ProgressContext);
  if (!state) throw new Error("useProgress must be used inside SessionRunner");
  return state;
}

export const RELOAD_MESSAGE = "Something went wrong. Reload the page.";

export const NOT_A_NUMBER_MESSAGE = "Enter a number, like 4, -3, or 1/2.";

/** What unlocks Next in a block that is not complete yet. */
function lockedMessage(block: BlockId): string {
  switch (block) {
    case "learn":
      return "Go through every step, then confirm you've read it, to unlock Next.";
    case "explain":
      return "Get your explanation graded to unlock Next.";
    case "exit":
      return "Answer every problem to unlock Finish.";
    default:
      return "Solve every problem to unlock Next.";
  }
}

// "moved" and "closed" have no message: the runner reloads the session from the server instead.
function moveError(error: Exclude<MoveError, "moved" | "closed">, block: BlockId): string {
  switch (error) {
    case "invalid":
      return RELOAD_MESSAGE;
    case "incomplete":
      return lockedMessage(block);
    case "first-block":
      return "This is the first block.";
    case "exit-check":
      return "The exit check can't go back.";
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
  initialExplainBack: ExplainStatus;
  /** Read live from each render: an exit answer refreshes the page with the new count. */
  exitAnswered: number;
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
  initialExplainBack,
  exitAnswered,
  panels,
}: SessionRunnerProps) {
  const router = useRouter();
  // Where the student is, and how long they had already spent there when they arrived; once the
  // session is finished, its verdict.
  const [at, setAt] = useState<
    { block: BlockId; elapsedMs: number } | { block: "done"; summary: SessionSummary }
  >({ block: initialBlock, elapsedMs: initialElapsedMs });
  const [solved, setSolved] = useState<ReadonlySet<string>>(() => new Set(initialSolved));
  const [lessonRead, setLessonRead] = useState(initialLessonRead);
  const [explainBack, setExplainBack] = useState(initialExplainBack);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const markSolved = (key: string) => setSolved((prev) => new Set(prev).add(key));
  const markLessonRead = () => setLessonRead(true);

  if (at.block === "done") return <SessionComplete title={title} summary={at.summary} />;
  const block = at.block;
  const position = BLOCK_IDS.indexOf(block);
  const complete = isBlockComplete(block, counts, {
    solved,
    lessonRead,
    explainBack,
    exitAnswered,
  });
  const last = position === BLOCK_IDS.length - 1;

  const move = (direction: Direction) => {
    setError(null);
    if (last && direction === "next") void loadSessionComplete();
    startTransition(async () => {
      const result = await moveBlock({ sessionId, from: block, direction });
      if (!result.ok) {
        if (result.error === "moved" || result.error === "closed") router.refresh();
        else setError(moveError(result.error, block));
        return;
      }
      setAt(
        result.to === "done"
          ? { block: "done", summary: result.summary }
          : { block: result.to, elapsedMs: result.elapsedMs },
      );
      // The page renders blocks 4 and 5 only once the student reaches them: block 4 needs guided
      // practice finished, and showing block 5 starts its clock. The refresh renders them now,
      // and the panel's code downloads while it runs.
      if (block === "guided" && result.to === "explain") {
        void loadExplainPanel();
        router.refresh();
      }
      if (block === "explain" && result.to === "exit") {
        void loadExitPanel();
        router.refresh();
      }
    });
  };

  return (
    <ProgressContext
      value={{
        solved,
        lessonRead,
        explainBack,
        exitAnswered,
        markSolved,
        markLessonRead,
        setExplainBack,
      }}
    >
      <div className="flex flex-col gap-8">
        <header className="flex flex-col gap-4">
          <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
            <h1 className="font-display text-2xl font-bold tracking-tight">{title}</h1>
            <div className="flex items-baseline gap-5">
              <BlockTimer
                key={block}
                budgetSeconds={blockBudgetSeconds(block, timerMode)}
                elapsedAtEntryMs={at.elapsedMs}
              />
              {/* The session is a focus view with no navigation: this is the one way out while it
                  runs (the session resumes from Today), and the end screen has its own. A plain
                  anchor, so the runner carries no link runtime. */}
              <a href="/student" className="link text-sm">
                Back to today
              </a>
            </div>
          </div>
          <BlockRail position={position} />
        </header>

        <section aria-labelledby="block-heading" className="flex flex-col gap-6">
          <h2 id="block-heading" className="font-display text-lg font-semibold">
            {BLOCKS[block].label}
          </h2>
          {panels[block]}
        </section>

        <footer className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-4">
            <Button
              variant="secondary"
              onClick={() => move("back")}
              disabled={position === 0 || block === "exit" || pending}
            >
              Back
            </Button>
            <Button onClick={() => move("next")} disabled={!complete || pending}>
              {last ? "Finish" : "Next"}
            </Button>
          </div>
          <p aria-live="polite" className="min-h-5 text-sm text-ink-soft">
            {error ?? (complete ? "" : lockedMessage(block))}
          </p>
        </footer>
      </div>
    </ProgressContext>
  );
}

/** The five blocks as a rail with a label under each, the current one filled through. */
function BlockRail({ position }: { position: number }) {
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
            <span className={`h-1.5 rounded-full ${i <= position ? "bg-primary" : "bg-track"}`} />
            <span
              className={`text-xs ${i === position ? "font-semibold text-ink" : "text-ink-soft"}`}
            >
              {BLOCKS[id].label}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
