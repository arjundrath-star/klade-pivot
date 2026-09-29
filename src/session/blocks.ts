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
 * Blocks that take answers today. Each one gates Next until every problem has a correct attempt;
 * every other block is a stub that never holds the student back.
 */
export const ANSWERED_BLOCK_IDS = ["warmup", "guided"] as const satisfies readonly ProblemBlockId[];

export type AnsweredBlockId = (typeof ANSWERED_BLOCK_IDS)[number];

function isAnsweredBlock(block: BlockId): block is AnsweredBlockId {
  return (ANSWERED_BLOCK_IDS as readonly BlockId[]).includes(block);
}

/** Identifies one problem within a session. */
export function problemKey(block: ProblemBlockId, index: number): string {
  return `${block}:${index}`;
}

/** How many problems each answered block holds. */
export type ProblemCounts = Readonly<Record<AnsweredBlockId, number>>;

/** A block is complete when it takes no answers or every one of its problems is solved. */
export function isBlockComplete(
  block: BlockId,
  counts: ProblemCounts,
  solved: ReadonlySet<string>,
): boolean {
  if (!isAnsweredBlock(block)) return true;
  for (let index = 0; index < counts[block]; index += 1) {
    if (!solved.has(problemKey(block, index))) return false;
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
