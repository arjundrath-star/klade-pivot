import type { CoachTurn } from "@/coach/turns";
import { sessionContent } from "@/content/sessions";
import { solvedProblems } from "@/db/queries/attempts";
import { coachTurnsFor } from "@/db/queries/coach";
import { getSession } from "@/db/queries/sessions";
import { problemKey, type AnsweredBlockId, type SessionProgress } from "@/session/blocks";
import {
  findProblem,
  problemCounts,
  sessionProblems,
  type SessionProblem,
} from "@/session/problems";

type CoachTurnRow = Awaited<ReturnType<typeof coachTurnsFor>>[number];

function turnsByProblem(rows: readonly CoachTurnRow[]): ReadonlyMap<string, CoachTurn[]> {
  const turns = new Map<string, CoachTurn[]>();
  for (const row of rows) {
    const key = problemKey(row.block, row.problemIndex);
    const turn = { level: row.level, student: row.studentText, coach: row.coachText };
    const existing = turns.get(key);
    if (existing) existing.push(turn);
    else turns.set(key, [turn]);
  }
  return turns;
}

/**
 * A student's session log with its problems, the progress that gates each block, and what the
 * coach has said so far, in one round trip. Undefined when the student has no log with that id.
 */
export async function loadSession(id: string, studentId: string) {
  const [session, solved, turns] = await Promise.all([
    getSession(id, studentId),
    solvedProblems(id),
    coachTurnsFor(id),
  ]);
  if (!session) return undefined;
  const content = sessionContent(session.contentKey);
  return {
    session,
    content,
    problems: sessionProblems(content, session.seed),
    counts: problemCounts(content),
    progress: {
      solved: new Set(solved.map((p) => problemKey(p.block, p.problemIndex))),
      lessonRead: session.lessonReadAt !== null,
    } satisfies SessionProgress,
    coach: {
      /** Coach calls made in the session so far, against the per-session limit. */
      calls: turns.length,
      /** Turns by `problemKey`, oldest first. */
      turns: turnsByProblem(turns),
    },
  };
}

export type LoadedSession = NonNullable<Awaited<ReturnType<typeof loadSession>>>;

export type OpenProblemError = "not-found" | "closed" | "wrong-block" | "invalid" | "solved";

export type OpenProblem =
  | { ok: true; loaded: LoadedSession; problem: SessionProblem }
  | { ok: false; error: OpenProblemError };

/**
 * The student's open session and one problem in it that can still take work: the session is
 * theirs, in progress and on `block`, and the problem exists and is not solved yet. Answering and
 * coaching both start here.
 */
export async function openProblem(
  sessionId: string,
  studentId: string,
  block: AnsweredBlockId,
  index: number,
): Promise<OpenProblem> {
  const loaded = await loadSession(sessionId, studentId);
  if (!loaded) return { ok: false, error: "not-found" };
  if (loaded.session.status !== "in_progress") return { ok: false, error: "closed" };
  if (loaded.session.currentBlock !== block) return { ok: false, error: "wrong-block" };
  const problem = findProblem(loaded.problems, block, index);
  if (!problem) return { ok: false, error: "invalid" };
  if (loaded.progress.solved.has(problemKey(block, index))) return { ok: false, error: "solved" };
  return { ok: true, loaded, problem };
}
