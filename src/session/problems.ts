import type { SessionContent } from "@/content/types";
import { generateInstance } from "@/engine/generate";
import { createRng } from "@/engine/random";
import { renderProblem, type RenderedProblem } from "@/engine/render";
import type { Interest, ValidTemplate } from "@/engine/types";
import {
  PROBLEM_BLOCK_IDS,
  problemKey,
  type ProblemBlockId,
  type ProblemCounts,
} from "@/session/blocks";

export interface SessionProblem {
  block: ProblemBlockId;
  /** Position within the block. */
  index: number;
  template: ValidTemplate;
  seed: number;
}

/** 32-bit FNV-1a. */
function hash(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) h = Math.imul(h ^ text.charCodeAt(i), 0x01000193);
  return h >>> 0;
}

/**
 * The seed for one problem, from the session seed and the problem's position, so a session log
 * replays the same problems on every load and adding a problem elsewhere leaves this one alone.
 */
export function problemSeed(sessionSeed: number, block: ProblemBlockId, index: number): number {
  return createRng(sessionSeed ^ hash(problemKey(block, index))).int(0, 2 ** 32 - 1);
}

/** Every problem in a session, in block order, with its seed. */
export function sessionProblems(content: SessionContent, sessionSeed: number): SessionProblem[] {
  return PROBLEM_BLOCK_IDS.flatMap((block) =>
    content[block].map((template, index) => ({
      block,
      index,
      template,
      seed: problemSeed(sessionSeed, block, index),
    })),
  );
}

/** The problem at `index` in `block`, if the session has one. */
export function findProblem(
  problems: readonly SessionProblem[],
  block: ProblemBlockId,
  index: number,
): SessionProblem | undefined {
  return problems.find((p) => p.block === block && p.index === index);
}

/** A session problem as its student sees it, framed by their interests. */
export function renderSessionProblem(
  problem: SessionProblem,
  interests: readonly Interest[],
): RenderedProblem {
  const instance = generateInstance(problem.template, problem.seed);
  return renderProblem(problem.template, instance, interests, problem.index);
}

export function problemCounts(content: SessionContent): ProblemCounts {
  return { warmup: content.warmup.length, guided: content.guided.length };
}
