import { isExplainFinal, type ExplainStatus } from "@/coach/rubric";

/** The five blocks of every session, in the order the student works through them. */
export const BLOCK_IDS = ["warmup", "learn", "guided", "explain", "exit"] as const;

export type BlockId = (typeof BLOCK_IDS)[number];

/** Label and time budget (spec §3.2) for each block. */
export const BLOCKS: Readonly<Record<BlockId, { label: string; minutes: number }>> = {
  warmup: { label: "Warm-up", minutes: 4 },
  learn: { label: "Learn", minutes: 6 },
  guided: { label: "Guided practice", minutes: 10 },
  explain: { label: "Explain-back", minutes: 5 },
  exit: { label: "Exit check", minutes: 5 },
};

/** Blocks whose content is a problem set. */
export const PROBLEM_BLOCK_IDS = ["warmup", "guided", "exit"] as const;

export type ProblemBlockId = (typeof PROBLEM_BLOCK_IDS)[number];

/** Blocks that take answers today. Each one gates Next until every problem has a correct attempt. */
export const ANSWERED_BLOCK_IDS = ["warmup", "guided"] as const satisfies readonly ProblemBlockId[];

export type AnsweredBlockId = (typeof ANSWERED_BLOCK_IDS)[number];

function isAnsweredBlock(block: BlockId): block is AnsweredBlockId {
  return (ANSWERED_BLOCK_IDS as readonly BlockId[]).includes(block);
}

/** Answered blocks where the coach can open. The exit check never gets one (decision D33). */
export const COACHED_BLOCK_IDS = ["guided"] as const satisfies readonly AnsweredBlockId[];

export type CoachedBlockId = (typeof COACHED_BLOCK_IDS)[number];

export function isCoachedBlock(block: BlockId): block is CoachedBlockId {
  return (COACHED_BLOCK_IDS as readonly BlockId[]).includes(block);
}

/** Identifies one problem within a session. */
export function problemKey(block: ProblemBlockId, index: number): string {
  return `${block}:${index}`;
}

/** How many problems each answered block holds. */
export type ProblemCounts = Readonly<Record<AnsweredBlockId, number>>;

/** What the student has done so far in a session, as stored on the server. */
export interface SessionProgress {
  /** `problemKey`s of the problems with a correct attempt. */
  solved: ReadonlySet<string>;
  /** The student confirmed they read the lesson. */
  lessonRead: boolean;
  /** Where the explain-back stands, from the graded attempts on the server. */
  explainBack: ExplainStatus;
}

/**
 * A block is complete when its gate is met: the lesson confirmed as read for learn, every problem
 * solved for an answered block, a final explain-back result (a pass, or the retry graded either
 * way) for explain. The exit block is a stub that never holds the student back.
 */
export function isBlockComplete(
  block: BlockId,
  counts: ProblemCounts,
  progress: SessionProgress,
): boolean {
  if (block === "learn") return progress.lessonRead;
  if (block === "explain") return isExplainFinal(progress.explainBack);
  if (!isAnsweredBlock(block)) return true;
  for (let index = 0; index < counts[block]; index += 1) {
    if (!progress.solved.has(problemKey(block, index))) return false;
  }
  return true;
}

export type Direction = "next" | "back";

type StepResult =
  { ok: true; to: BlockId | "done" } | { ok: false; error: "incomplete" | "first-block" };

/**
 * Moves one block. Back is always open except from the first block; Next needs the current block
 * complete, and Next from the last block finishes the session.
 */
export function step(current: BlockId, direction: Direction, currentComplete: boolean): StepResult {
  const index = BLOCK_IDS.indexOf(current);
  if (direction === "back") {
    return index === 0
      ? { ok: false, error: "first-block" }
      : { ok: true, to: BLOCK_IDS[index - 1] };
  }
  if (!currentComplete) return { ok: false, error: "incomplete" };
  return { ok: true, to: BLOCK_IDS[index + 1] ?? "done" };
}
