import { explainStatus, type ExplainResult } from "@/coach/rubric";
import type { CoachTurn } from "@/coach/turns";
import { sessionContent } from "@/content/sessions";
import { exitAttemptsFor, settledAttempts } from "@/db/queries/attempts";
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
 * else the solved guided problem that took the most coach hints (the latest on a tie). A problem
 * skipped in a demo was never solved, so it is a candidate only when every guided problem was
 * skipped. Guided practice is all settled before block 4 opens and the coach only helps on
 * unsettled problems, so the choice does not change once the student gets there.
 */
function explainProblem(
  problems: readonly SessionProblem[],
  turns: ReadonlyMap<string, readonly CoachTurn[]>,
  explained: readonly ExplainBackRow[],
  solved: ReadonlySet<string>,
): SessionProblem {
  const [first] = explained;
  const recorded = first && findProblem(problems, first.block, first.problemIndex);
  if (recorded) return recorded;
  const guided = problems.filter((p) => p.block === "guided");
  const solvedGuided = guided.filter((p) => solved.has(problemKey(p.block, p.index)));
  const hints = (p: SessionProblem) => turns.get(problemKey(p.block, p.index))?.length ?? 0;
  let chosen: SessionProblem | undefined;
  for (const p of solvedGuided.length > 0 ? solvedGuided : guided) {
    if (!chosen || hints(p) >= hints(chosen)) chosen = p;
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
  const [session, settled, turns, explained, exitAttempts] = await Promise.all([
    getSession(id, studentId),
    settledAttempts(id),
    coachTurnsFor(id),
    explainBacksFor(id),
    exitAttemptsFor(id),
  ]);
  if (!session) return undefined;
  const content = sessionContent(session.contentKey);
  const problems = sessionProblems(content, session.seed);
  const coachTurns = turnsByProblem(turns);
  const keysOf = (skipped: boolean) =>
    new Set(
      settled.filter((p) => p.skipped === skipped).map((p) => problemKey(p.block, p.problemIndex)),
    );
  const solved = keysOf(false);
  // A problem with a correct attempt is solved, even if a skip from another tab landed too.
  const skipped = new Set([...keysOf(true)].filter((key) => !solved.has(key)));
  return {
    session,
    content,
    problems,
    counts: problemCounts(content),
    progress: {
      solved,
      skipped,
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
      problem: explainProblem(problems, coachTurns, explained, solved),
      /**
       * Graded attempts, first attempt first. After an admin override the student sees none: the
       * override is never shown to them, and a lone failing card beside an unlocked Next would
       * contradict it.
       */
      results: explained.some((row) => row.source === "override")
        ? []
        : explained.map(explainResult),
      /** Every recorded attempt, an override included, for numbering the next one. */
      attempts: explained.length,
      /** The row of the latest graded attempt, which is the final one once the status is final. */
      latestId: explained.at(-1)?.id,
    },
    /** Exit-check attempts, one per answered problem. */
    exitAttempts,
  };
}

export type LoadedSession = NonNullable<Awaited<ReturnType<typeof loadSession>>>;

export type OpenProblemError =
  "not-found" | "closed" | "wrong-block" | "invalid" | "solved" | "skipped";

export interface OpenedProblem {
  loaded: LoadedSession;
  problem: SessionProblem;
}

export type OpenProblem = ({ ok: true } & OpenedProblem) | { ok: false; error: OpenProblemError };

/**
 * The student's open session and one problem in it that can still take work: the session is
 * theirs, in progress and on `block`, and the problem exists and is neither solved nor skipped.
 * Answering, skipping and coaching all start here.
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
  const key = problemKey(block, index);
  if (loaded.progress.solved.has(key)) return { ok: false, error: "solved" };
  if (loaded.progress.skipped.has(key)) return { ok: false, error: "skipped" };
  return { ok: true, loaded, problem };
}
