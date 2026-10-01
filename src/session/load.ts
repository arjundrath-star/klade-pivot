import { explainStatus, type ExplainResult } from "@/coach/rubric";
import type { CoachTurn } from "@/coach/turns";
import { sessionContent } from "@/content/sessions";
import { exitAttemptsFor, solvedProblems } from "@/db/queries/attempts";
import { coachTurnsFor } from "@/db/queries/coach";
import { explainBacksFor } from "@/db/queries/explain";
import { getSession } from "@/db/queries/sessions";
import { problemKey, type AnsweredBlockId, type SessionProgress } from "@/session/blocks";
import {
  findProblem,
  problemCounts,
  sessionProblems,
  type SessionProblem,
} from "@/session/problems";

type CoachTurnRow = Awaited<ReturnType<typeof coachTurnsFor>>[number];
type ExplainBackRow = Awaited<ReturnType<typeof explainBacksFor>>[number];

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
 * The solved problem the student explains in block 4: the one already explained if there is one,
 * else the guided problem that took the most coach hints (the latest on a tie). Guided practice is
 * all solved before block 4 opens and the coach only helps on unsolved problems, so the choice
 * does not change once the student gets there.
 */
function explainProblem(
  problems: readonly SessionProblem[],
  turns: ReadonlyMap<string, readonly CoachTurn[]>,
  explained: readonly ExplainBackRow[],
): SessionProblem {
  const [first] = explained;
  const recorded = first && findProblem(problems, first.block, first.problemIndex);
  if (recorded) return recorded;
  const hints = (p: SessionProblem) => turns.get(problemKey(p.block, p.index))?.length ?? 0;
  let chosen: SessionProblem | undefined;
  for (const p of problems) {
    if (p.block === "guided" && (!chosen || hints(p) >= hints(chosen))) chosen = p;
  }
  if (!chosen) throw new Error("Session content has no guided problems to explain");
  return chosen;
}

function explainResult(row: ExplainBackRow): ExplainResult {
  const { attempt, correctness, justification, precision, feedback, verdict } = row;
  return { attempt, scores: { correctness, justification, precision }, feedback, verdict };
}

/**
 * A student's session log with its problems, the progress that gates each block, and what the
 * coach has said so far, in one round trip. Undefined when the student has no log with that id.
 */
export async function loadSession(id: string, studentId: string) {
  const [session, solved, turns, explained, exitAttempts] = await Promise.all([
    getSession(id, studentId),
    solvedProblems(id),
    coachTurnsFor(id),
    explainBacksFor(id),
    exitAttemptsFor(id),
  ]);
  if (!session) return undefined;
  const content = sessionContent(session.contentKey);
  const problems = sessionProblems(content, session.seed);
  const coachTurns = turnsByProblem(turns);
  return {
    session,
    content,
    problems,
    counts: problemCounts(content),
    progress: {
      solved: new Set(solved.map((p) => problemKey(p.block, p.problemIndex))),
      lessonRead: session.lessonReadAt !== null,
      explainBack: explainStatus(explained.map((row) => row.verdict)),
      exitAnswered: exitAttempts.length,
    } satisfies SessionProgress,
    coach: {
      /** Coach calls made in the session so far, against the per-session limit. */
      calls: turns.length,
      /** Turns by `problemKey`, oldest first. */
      turns: coachTurns,
    },
    explain: {
      problem: explainProblem(problems, coachTurns, explained),
      /** Graded attempts, first attempt first. */
      results: explained.map(explainResult),
      /** The row of the latest graded attempt, which is the final one once the status is final. */
      latestId: explained.at(-1)?.id,
    },
    /** Exit-check attempts, one per answered problem. */
    exitAttempts,
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
