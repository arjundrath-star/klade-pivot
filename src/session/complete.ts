import { recordAlert } from "@/db/queries/alerts";
import { finishSession } from "@/db/queries/sessions";
import { masteryMessage } from "@/parent/alerts";
import { isBlockComplete, problemKey } from "@/session/blocks";
import { loadSession, type LoadedSession } from "@/session/load";
import { masteryVerdict, type SessionOutcome } from "@/session/mastery";
import { sessionAwards, sessionRewards, type SessionRewards } from "@/session/rewards";
import { leaveBlock } from "@/session/timer";

/** What the student sees at the end of a session. */
export interface SessionSummary {
  outcome: SessionOutcome;
  exitCorrect: number;
  exitTotal: number;
  explainPassed: boolean;
  rewards: SessionRewards;
}

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
export function sessionSummary(
  loaded: LoadedSession,
  outcome: SessionOutcome,
  rewards: SessionRewards,
): SessionSummary {
  return {
    outcome,
    exitCorrect: exitCorrect(loaded),
    exitTotal: loaded.counts.exit,
    explainPassed: loaded.progress.explainBack === "passed",
    rewards,
  };
}

/**
 * Finishes the student's session, the one place a session completes. A session counts as complete
 * only when every exit-check problem has its attempt and none of them had help (decision D33); a
 * request that falls short is refused and the session stays in progress. The verdict comes from
 * the stored exit attempts and explain-back, never from the client, and is written to the concept's
 * mastery row as the log closes, with the exit-check XP, badges and completion rewards it earns
 * (`sessionAwards`). Side effects of a finished session belong here, like the parent's mastery
 * alert.
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
  const completedAt = new Date();
  const awards = await sessionAwards(loaded, outcome, score, completedAt);
  const finished = await finishSession({
    sessionLogId: session.id,
    studentId: session.studentId,
    sessionTemplateId: session.sessionTemplateId,
    outcome,
    exitScore: score,
    explainBackId,
    blockElapsedMs: leaveBlock(session.blockElapsedMs, "exit", session.blockStartedAt),
    completedAt,
    xp: awards.xp,
    badges: awards.badges,
    unlocks: awards.unlocks,
  });
  if (!finished) return { ok: false, error: "moved" };
  const [rewards] = await Promise.all([
    sessionRewards(session, completedAt, awards.change),
    outcome === "mastered"
      ? recordAlert({
          familyId: session.familyId,
          studentId: session.studentId,
          type: "milestone",
          sessionLogId: session.id,
          message: masteryMessage(session.studentName, session.title, score, counts.exit),
        })
      : undefined,
  ]);
  return { ok: true, summary: sessionSummary(loaded, outcome, rewards) };
}
