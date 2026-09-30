import { getDb } from "@/db/client";
import { DEMO_STUDENT_ID } from "@/db/demo";
import { explainBacks } from "@/db/schema";
import { generateInstance } from "@/engine/generate";
import type { RenderedProblem } from "@/engine/render";
import type { AnsweredBlockId } from "@/session/blocks";
import { loadSession } from "@/session/load";
import { renderSessionProblem } from "@/session/problems";

async function blockProblems(sessionId: string, block: AnsweredBlockId) {
  const loaded = await loadSession(sessionId, DEMO_STUDENT_ID);
  if (!loaded) throw new Error(`session ${sessionId} not found`);
  return {
    interests: loaded.session.interests,
    problems: loaded.problems.filter((p) => p.block === block),
  };
}

/** The answers to a block's problems, replayed from the seed the server stored for the session. */
export async function answersFor(sessionId: string, block: AnsweredBlockId): Promise<number[]> {
  const { problems } = await blockProblems(sessionId, block);
  return problems.map((p) => generateInstance(p.template, p.seed).solution);
}

/** A block's problems as the server renders them for the session's student. */
export async function renderedFor(
  sessionId: string,
  block: AnsweredBlockId,
): Promise<RenderedProblem[]> {
  const { interests, problems } = await blockProblems(sessionId, block);
  return problems.map((p) => renderSessionProblem(p, interests));
}

/** Stores a passing first explain-back for the session, as the grader would have. */
export async function recordPass(sessionId: string, text: string): Promise<void> {
  const loaded = await loadSession(sessionId, DEMO_STUDENT_ID);
  if (!loaded) throw new Error(`session ${sessionId} not found`);
  const { problem } = loaded.explain;
  const db = await getDb();
  await db.insert(explainBacks).values({
    sessionLogId: sessionId,
    block: problem.block,
    problemIndex: problem.index,
    attempt: 1,
    text,
    source: "typed",
    correctness: 3,
    justification: 2,
    precision: 2,
    feedback: "You said why each step keeps the equation balanced.",
    verdict: "pass",
    pasted: false,
    durationMs: 20_000,
    charsPerSecond: text.length / 20,
  });
}
