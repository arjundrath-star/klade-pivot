import { DEMO_STUDENT_ID } from "@/db/demo";
import { generateInstance } from "@/engine/generate";
import type { AnsweredBlockId } from "@/session/blocks";
import { loadSession } from "@/session/load";

/** The answers to a block's problems, replayed from the seed the server stored for the session. */
export async function answersFor(sessionId: string, block: AnsweredBlockId): Promise<number[]> {
  const loaded = await loadSession(sessionId, DEMO_STUDENT_ID);
  if (!loaded) throw new Error(`session ${sessionId} not found`);
  return loaded.problems
    .filter((p) => p.block === block)
    .map((p) => generateInstance(p.template, p.seed).solution);
}
