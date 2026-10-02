"use client";

import { createContext, use, useRef, useState, useTransition, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { BlockTimer } from "./block-timer";
import { ChapterReader, type ChapterNodes } from "./chapter-reader";
import { loadExitPanel } from "./exit-check";
import { loadExplainPanel } from "./explain-back";
import { moveBlock, type MoveError } from "./actions";
import { Notebook } from "./notebook";
import type { ExplainStatus } from "@/coach/rubric";
import { Button } from "@/components/ui/button";
import {
  BLOCK_IDS,
  BLOCKS,
  firstUnsolved,
  isAnsweredBlock,
  isBlockComplete,
  isProblemBlock,
  problemKey,
  settledProblems,
  type AnsweredBlockId,
  type BlockId,
  type Direction,
  type ProblemBlockId,
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
  markSkipped: (key: string) => void;
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

/** What unlocks the way forward in a block that is not complete yet. */
function lockedMessage(block: BlockId): string {
  switch (block) {
    case "learn":
      return "Confirm you've read the chapter to unlock Next.";
    case "explain":
      return "Get your explanation graded to unlock Next.";
    case "exit":
      return "Answer every problem to unlock Finish.";
    default:
      return "Solve this problem to move on.";
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
  /** Problems skipped in a demo; they settle the block's gate like a solved one. */
  initialSkipped: readonly string[];
  initialLessonRead: boolean;
  initialExplainBack: ExplainStatus;
  /** Read live from each render: an exit answer refreshes the page with the new count. */
  exitAnswered: number;
  /** Where the session sits in the course, rendered on the server. */
  crumb: ReactNode;
  /** The problems of each answered block, in order, rendered on the server; shown one at a time. */
  problems: Readonly<Record<AnsweredBlockId, readonly ReactNode[]>>;
  /** The chapter, rendered on the server once: the learn block, and the notebook beside practice. */
  chapter: ChapterNodes;
  /** The explain-back and exit-check panels, rendered on the server. */
  panels: Readonly<Record<"explain" | "exit", ReactNode>>;
  initialNotes: string;
}

export function SessionRunner({
  sessionId,
  title,
  initialBlock,
  initialElapsedMs,
  timerMode,
  counts,
  initialSolved,
  initialSkipped,
  initialLessonRead,
  initialExplainBack,
  exitAnswered,
  crumb,
  problems,
  chapter,
  panels,
  initialNotes,
}: SessionRunnerProps) {
  const router = useRouter();
  // Where the student is, and how long they had already spent there when they arrived; once the
  // session is finished, its verdict.
  const [at, setAt] = useState<
    { block: BlockId; elapsedMs: number } | { block: "done"; summary: SessionSummary }
  >({ block: initialBlock, elapsedMs: initialElapsedMs });
  const [solved, setSolved] = useState<ReadonlySet<string>>(() => new Set(initialSolved));
  const [skipped, setSkipped] = useState<ReadonlySet<string>>(() => new Set(initialSkipped));
  const settled = settledProblems({ solved, skipped });
  // The problem on the desk in each answered block: the first one still to settle on arrival, or
  // the last one when the block is already done.
  const [cursor, setCursor] = useState<Readonly<Record<AnsweredBlockId, number>>>(() => {
    const onDesk = (block: AnsweredBlockId) =>
      firstUnsolved(block, counts, settled) ?? Math.max(counts[block] - 1, 0);
    return { warmup: onDesk("warmup"), guided: onDesk("guided") };
  });
  const [lessonRead, setLessonRead] = useState(initialLessonRead);
  const [explainBack, setExplainBack] = useState(initialExplainBack);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  // Saves whatever the notes panel still holds; a block move waits for it, since the move's
  // refresh would otherwise reload the notes before the save lands.
  const flushNotes = useRef<() => Promise<void>>(async () => {});

  const markSolved = (key: string) => setSolved((prev) => new Set(prev).add(key));
  const markSkipped = (key: string) => setSkipped((prev) => new Set(prev).add(key));
  const markLessonRead = () => setLessonRead(true);

  if (at.block === "done") return <SessionComplete title={title} summary={at.summary} />;
  const block = at.block;
  const position = BLOCK_IDS.indexOf(block);
  const complete = isBlockComplete(block, counts, {
    solved,
    skipped,
    lessonRead,
    explainBack,
    exitAnswered,
  });
  const last = position === BLOCK_IDS.length - 1;

  const move = (direction: Direction) => {
    setError(null);
    if (last && direction === "next") void loadSessionComplete();
    startTransition(async () => {
      await flushNotes.current();
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

  // One problem at a time: the problem on the desk in each problem block, the exit check's being
  // the next one the server has not recorded an answer for.
  const index: Readonly<Record<ProblemBlockId, number>> = { ...cursor, exit: exitAnswered };
  const counter =
    isProblemBlock(block) && index[block] < counts[block]
      ? `Problem ${index[block] + 1} of ${counts[block]}`
      : null;
  const body = isAnsweredBlock(block) ? (
    problems[block][cursor[block]]
  ) : block === "learn" ? (
    <ChapterReader sessionId={sessionId} chapter={chapter} />
  ) : (
    panels[block]
  );

  // The way forward: the next problem after a correct answer (or a demo skip) while the block has more, else the
  // block's own Next (Finish on the last block).
  const nextProblem = isAnsweredBlock(block) && cursor[block] < counts[block] - 1 ? block : null;
  const forwardLabel = nextProblem ? "Next problem" : last ? "Finish" : "Next";
  const forwardLocked = nextProblem
    ? !settled.has(problemKey(nextProblem, cursor[nextProblem]))
    : !complete;
  const forward = () => {
    if (!nextProblem) {
      move("next");
      return;
    }
    setError(null);
    setCursor((prev) => ({ ...prev, [nextProblem]: prev[nextProblem] + 1 }));
  };

  return (
    <ProgressContext
      value={{
        solved,
        skipped,
        lessonRead,
        explainBack,
        exitAnswered,
        markSolved,
        markSkipped,
        markLessonRead,
        setExplainBack,
      }}
    >
      <div className="flex flex-1 flex-col gap-6">
        <header className="flex flex-col gap-3 border-b border-line pb-4">
          <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
            {crumb}
            {/* The session is a focus view with no navigation: this is the one way out while it
                runs (the session resumes from Today), and the end screen has its own. A plain
                anchor, so the runner carries no link runtime. */}
            <a href="/student" className="link text-sm">
              Back to today
            </a>
          </div>
          <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-3">
            <BlockRail position={position} />
            <div className="flex items-baseline gap-5 font-display text-sm font-semibold tabular-nums">
              {counter && <p>{counter}</p>}
              <BlockTimer
                key={block}
                budgetSeconds={blockBudgetSeconds(block, timerMode)}
                elapsedAtEntryMs={at.elapsedMs}
              />
            </div>
          </div>
        </header>

        <div className="grid flex-1 gap-8 lg:grid-cols-[minmax(0,1fr)_21rem] lg:gap-10">
          <div className="flex min-w-0 flex-col gap-6">
            <section aria-labelledby="block-heading" className="flex flex-col gap-5">
              <h1 id="block-heading" className="font-display text-xl font-semibold tracking-tight">
                {BLOCKS[block].label}
              </h1>
              {body}
            </section>

            <footer className="flex flex-col gap-3 border-t border-line pt-4">
              <div className="flex items-center justify-between gap-4">
                <Button
                  variant="secondary"
                  onClick={() => move("back")}
                  disabled={position === 0 || block === "exit" || pending}
                >
                  Back
                </Button>
                <Button onClick={forward} disabled={forwardLocked || pending}>
                  {forwardLabel}
                </Button>
              </div>
              <p aria-live="polite" className="min-h-5 text-sm text-ink-soft">
                {error ?? (forwardLocked ? lockedMessage(block) : "")}
              </p>
            </footer>
          </div>

          <Notebook
            sessionId={sessionId}
            initialNotes={initialNotes}
            flushNotes={flushNotes}
            reference={block === "guided" ? chapter : undefined}
          />
        </div>
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
      className="min-w-0 flex-1 basis-80"
    >
      <ol className="grid grid-cols-5 gap-2">
        {BLOCK_IDS.map((id, i) => (
          <li key={id} className="flex flex-col gap-1.5">
            <span className={`h-1.5 rounded-full ${i <= position ? "bg-primary" : "bg-track"}`} />
            {/* On a phone the heading below names the block; the labels would only truncate. */}
            <span
              className={`hidden truncate text-xs sm:block ${i === position ? "font-semibold text-ink" : "text-ink-soft"}`}
            >
              {BLOCKS[id].label}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
