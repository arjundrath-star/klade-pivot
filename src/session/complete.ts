import { finishSession } from "@/db/queries/sessions";
import { isBlockComplete, problemKey } from "@/session/blocks";
import { loadSession, type LoadedSession } from "@/session/load";
import { masteryVerdict, type SessionOutcome, type SessionSummary } from "@/session/mastery";
import { leaveBlock } from "@/session/timer";

export type CompleteError = "closed" | "moved" | "incomplete" | "aided";

export type CompleteResult =
  { ok: true; summary: SessionSummary } | { ok: false; error: CompleteError };

/** Any help in block 5: an exit attempt made with hints, or a coach turn on an exit problem. */
function exitWasAided({ exitAttempts, coach, counts }: LoadedSession): boolean {
  if (exitAttempts.some((attempt) => attempt.hintsUsed > 0)) return true;
  for (let index = 0; index < counts.exit; index += 1) {
    if (coach.turns.has(problemKey("exit", index))) return true;
  }
  return false;
}

function exitCorrect({ exitAttempts }: LoadedSession): number {
  return exitAttempts.filter((attempt) => attempt.correct).length;
}

/** The end-of-session result for a session whose verdict is `outcome`. */
export function sessionSummary(loaded: LoadedSession, outcome: SessionOutcome): SessionSummary {
  return {
    outcome,
    exitCorrect: exitCorrect(loaded),
    exitTotal: loaded.counts.exit,
    explainPassed: loaded.progress.explainBack === "passed",
  };
}

/**
 * Finishes the student's session, the one place a session completes. A session counts as complete
 * only when every exit-check problem has its attempt and none of them had help (decision D33); a
 * request that falls short is refused and the session stays in progress. The verdict comes from
 * the stored exit attempts and explain-back, never from the client, and is written to the concept's
 * mastery row as the log closes. Side effects of a finished session belong here.
 */
export async function completeSession(
  sessionId: string,
  studentId: string,
): Promise<CompleteResult> {
  const loaded = await loadSession(sessionId, studentId);
  if (loaded?.session.status !== "in_progress") return { ok: false, error: "closed" };
  const { session, counts, progress, explain } = loaded;
  if (session.currentBlock !== "exit") return { ok: false, error: "moved" };
  const explainBackId = explain.latestId;
  if (
    !isBlockComplete("explain", counts, progress) ||
    !isBlockComplete("exit", counts, progress) ||
    explainBackId === undefined
  ) {
    return { ok: false, error: "incomplete" };
  }
  if (exitWasAided(loaded)) return { ok: false, error: "aided" };

  const score = exitCorrect(loaded);
  const outcome = masteryVerdict(score, progress.explainBack);
  const finished = await finishSession({
    sessionLogId: session.id,
    studentId: session.studentId,
    sessionTemplateId: session.sessionTemplateId,
    outcome,
    exitScore: score,
    explainBackId,
    blockElapsedMs: leaveBlock(session.blockElapsedMs, "exit", session.blockStartedAt),
  });
  if (!finished) return { ok: false, error: "moved" };
  return { ok: true, summary: sessionSummary(loaded, outcome) };
}
