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

/**
 * Practice blocks: answers retry until right, and Next waits for a correct attempt on every problem.
 * The exit check takes answers too but is not one of these: it takes one attempt per problem, and
 * "all correct" would trap a student who fails it.
 */
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

/** How many problems each problem block holds. */
export type ProblemCounts = Readonly<Record<ProblemBlockId, number>>;

/** What the student has done so far in a session, as stored on the server. */
export interface SessionProgress {
  /** `problemKey`s of the problems with a correct attempt. */
  solved: ReadonlySet<string>;
  /** The student confirmed they read the lesson. */
  lessonRead: boolean;
  /** Where the explain-back stands, from the graded attempts on the server. */
  explainBack: ExplainStatus;
  /** Exit-check problems answered, one attempt each, right or wrong. */
  exitAnswered: number;
}

/**
 * A block is complete when its gate is met: the lesson confirmed as read for learn, every problem
 * solved for an answered block, a final explain-back result (a pass, or the retry graded either
 * way) for explain, an attempt on every problem for the exit check.
 */
export function isBlockComplete(
  block: BlockId,
  counts: ProblemCounts,
  progress: SessionProgress,
): boolean {
  if (block === "learn") return progress.lessonRead;
  if (block === "explain") return isExplainFinal(progress.explainBack);
  if (block === "exit") return progress.exitAnswered >= counts.exit;
  if (!isAnsweredBlock(block)) return true;
  for (let index = 0; index < counts[block]; index += 1) {
    if (!progress.solved.has(problemKey(block, index))) return false;
  }
  return true;
}

export type Direction = "next" | "back";

type StepResult =
  | { ok: true; to: BlockId | "done" }
  | { ok: false; error: "incomplete" | "first-block" | "exit-check" };

/**
 * Moves one block. Back is open except from the first block and from the exit check, which is
 * closed-book: the lesson's worked example is one block away. Next needs the current block
 * complete, and Next from the last block finishes the session.
 */
export function step(current: BlockId, direction: Direction, currentComplete: boolean): StepResult {
  const index = BLOCK_IDS.indexOf(current);
  if (direction === "back") {
    if (current === "exit") return { ok: false, error: "exit-check" };
    return index === 0
      ? { ok: false, error: "first-block" }
      : { ok: true, to: BLOCK_IDS[index - 1] };
  }
  if (!currentComplete) return { ok: false, error: "incomplete" };
  return { ok: true, to: BLOCK_IDS[index + 1] ?? "done" };
}
