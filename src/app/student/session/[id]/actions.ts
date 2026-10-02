"use server";

import { z } from "zod";
import { coachConfigured } from "@/coach/client";
import { gradeExplanation, GRADER_CALLS_PER_SESSION, GRADER_MODEL } from "@/coach/grader";
import { coachContext, untrustedText } from "@/coach/prompt";
import {
  EXPLAIN_SOURCES,
  explainStatus,
  isExplainFinal,
  MAX_EXPLANATION_LENGTH,
  passes,
  type ExplainError,
  type ExplainResult,
  type ExplainStatus,
} from "@/coach/rubric";
import { recordAttempt, recordExitAttempt } from "@/db/queries/attempts";
import { exitShownAt } from "@/db/queries/exit";
import { graderCalls, recordExplainBack, recordGraderCalls } from "@/db/queries/explain";
import { saveSessionNotes } from "@/db/queries/notes";
import { markLessonRead, moveSession } from "@/db/queries/sessions";
import { checkAnswer } from "@/engine/check";
import { generateInstance } from "@/engine/generate";
import { rational } from "@/engine/rational";
import {
  ANSWERED_BLOCK_IDS,
  BLOCK_IDS,
  isBlockComplete,
  problemKey,
  step,
  type BlockId,
} from "@/session/blocks";
import { completeSession, type CompleteError, type SessionSummary } from "@/session/complete";
import { currentStudentId } from "@/session/current-student";
import { loadSession, openProblem, type OpenProblemError } from "@/session/load";
import { findProblem } from "@/session/problems";
import { NOTES_MAX_LENGTH, normalizeNotes } from "@/session/notes";
import { blockXp } from "@/session/rewards";
import { attemptMs, isExitAnswerLate, leaveBlock } from "@/session/timer";

// Longer gaps (a tab left open overnight) are recorded as an hour rather than rejected.
const elapsedMs = z.int().nonnegative().transform(attemptMs);

const AnswerInput = z.object({
  sessionId: z.uuid(),
  block: z.enum(ANSWERED_BLOCK_IDS),
  index: z.int().nonnegative(),
  answer: z.string().max(40),
  timeMs: elapsedMs,
});

type AnswerError = "invalid" | "closed" | "wrong-block" | "already-solved";

export type AnswerResult =
  | { ok: true; verdict: "correct" | "incorrect" | "not-a-number" }
  | { ok: false; error: AnswerError };

// A session that is not the student's reads as closed: the answer form never says which.
const ANSWER_ERRORS: Readonly<Record<OpenProblemError, AnswerError>> = {
  "not-found": "closed",
  closed: "closed",
  "wrong-block": "wrong-block",
  invalid: "invalid",
  solved: "already-solved",
};

const ExitAnswerInput = z.object({
  sessionId: z.uuid(),
  index: z.int().nonnegative(),
  answer: z.string().max(40),
  /** The countdown ran out: the answer is recorded as incorrect, whatever was typed. */
  expired: z.boolean(),
});

export type ExitAnswerResult =
  | { ok: true; verdict: "recorded" | "not-a-number" }
  | { ok: false; error: "invalid" | "closed" | "wrong-block" | "answered" };

const ExplainInput = z.object({
  sessionId: z.uuid(),
  text: untrustedText(MAX_EXPLANATION_LENGTH),
  source: z.enum(EXPLAIN_SOURCES),
  pasted: z.boolean(),
  durationMs: elapsedMs,
});

export type ExplainSubmitResult =
  { ok: true; result: ExplainResult; status: ExplainStatus } | { ok: false; error: ExplainError };

const LessonInput = z.object({ sessionId: z.uuid() });

export type LessonResult = { ok: true } | { ok: false; error: "invalid" | "closed" };

const NotesInput = z.object({
  sessionId: z.uuid(),
  notes: z.string().transform(normalizeNotes).pipe(z.string().max(NOTES_MAX_LENGTH)),
});

export type NotesResult = { ok: true } | { ok: false; error: "invalid" | "closed" };

const MoveInput = z.object({
  sessionId: z.uuid(),
  from: z.enum(BLOCK_IDS),
  direction: z.enum(["next", "back"]),
});

export type MoveError =
  "invalid" | "closed" | "moved" | "incomplete" | "first-block" | "exit-check";

export type MoveResult =
  /** `elapsedMs` is the time already spent in `to` on earlier visits. */
  | { ok: true; to: BlockId; elapsedMs: number }
  | { ok: true; to: "done"; summary: SessionSummary }
  | { ok: false; error: MoveError };

// Help in the exit check never comes through the app, so a session refused for it reads as broken.
const COMPLETE_ERRORS: Readonly<Record<CompleteError, MoveError>> = {
  closed: "closed",
  moved: "moved",
  incomplete: "incomplete",
  aided: "invalid",
};

async function loadOpenSession(sessionId: string) {
  const loaded = await loadSession(sessionId, await currentStudentId());
  return loaded?.session.status === "in_progress" ? loaded : undefined;
}

/** Grades one answer and records it as an attempt. Malformed input is answered but not recorded. */
export async function submitAnswer(input: z.input<typeof AnswerInput>): Promise<AnswerResult> {
  const parsed = AnswerInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const { sessionId, block, index, answer, timeMs } = parsed.data;

  const opened = await openProblem(sessionId, await currentStudentId(), block, index);
  if (!opened.ok) return { ok: false, error: ANSWER_ERRORS[opened.error] };
  const { loaded, problem } = opened;

  const instance = generateInstance(problem.template, problem.seed);
  const check = checkAnswer(answer, rational(instance.solution));
  if (check.normalized === null) return { ok: true, verdict: "not-a-number" };

  await recordAttempt({
    studentId: loaded.session.studentId,
    sessionLogId: sessionId,
    block,
    problemIndex: index,
    templateKey: instance.templateKey,
    seed: instance.seed,
    answer: answer.trim(),
    correct: check.correct,
    timeMs,
    hintsUsed: loaded.coach.turns.get(problemKey(block, index))?.length ?? 0,
  });
  return { ok: true, verdict: check.correct ? "correct" : "incorrect" };
}

/**
 * Records the one attempt an exit-check problem takes. Only the problem on screen can be answered,
 * and the clock is the server's: an answer that arrives after the student's time per problem, or
 * that the browser sent because its countdown ran out, is recorded as incorrect. An on-time answer
 * that is not a number is not recorded, so the student can fix it while the clock runs.
 */
export async function submitExitAnswer(
  input: z.input<typeof ExitAnswerInput>,
): Promise<ExitAnswerResult> {
  const parsed = ExitAnswerInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const { sessionId, index, answer, expired } = parsed.data;

  const [open, shownAt] = await Promise.all([
    loadOpenSession(sessionId),
    exitShownAt(sessionId, index),
  ]);
  if (!open) return { ok: false, error: "closed" };
  if (open.session.currentBlock !== "exit") return { ok: false, error: "wrong-block" };
  const current = open.progress.exitAnswered;
  if (index < current) return { ok: false, error: "answered" };
  const problem = findProblem(open.problems, "exit", index);
  if (index > current || !problem || !shownAt) return { ok: false, error: "invalid" };

  const elapsed = Date.now() - shownAt.getTime();
  const late = expired || isExitAnswerLate(elapsed, open.session.timerMode);
  const instance = generateInstance(problem.template, problem.seed);
  const check = checkAnswer(answer, rational(instance.solution));
  if (!late && check.normalized === null) return { ok: true, verdict: "not-a-number" };

  const recorded = await recordExitAttempt({
    studentId: open.session.studentId,
    sessionLogId: sessionId,
    problemIndex: index,
    templateKey: instance.templateKey,
    seed: instance.seed,
    answer: answer.trim(),
    correct: !late && check.correct,
    timeMs: attemptMs(elapsed),
    hintsUsed: open.coach.turns.get(problemKey("exit", index))?.length ?? 0,
  });
  return recorded ? { ok: true, verdict: "recorded" } : { ok: false, error: "answered" };
}

/**
 * Records that the student read the lesson, which unlocks Next out of the learn block. "closed"
 * means the session is not open on the learn block, for example because another tab moved it.
 */
export async function confirmLesson(input: z.input<typeof LessonInput>): Promise<LessonResult> {
  const parsed = LessonInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const marked = await markLessonRead(parsed.data.sessionId, await currentStudentId());
  return marked ? { ok: true } : { ok: false, error: "closed" };
}

/**
 * Saves what the student typed in the notes panel of their open session. The notes are plain text
 * and the student's own: this is the only place they are written, and the session page is the
 * only place they are read. "closed" means the session is not theirs or not open any more.
 */
export async function saveNotes(input: z.input<typeof NotesInput>): Promise<NotesResult> {
  const parsed = NotesInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const { sessionId, notes } = parsed.data;
  const saved = await saveSessionNotes(sessionId, await currentStudentId(), notes);
  return saved ? { ok: true } : { ok: false, error: "closed" };
}

/**
 * Moves the session one block. The server decides whether the current block is complete. Next out
 * of a complete block pays its XP first (once per session, however often the student goes back
 * and forth), and Next from the exit check finishes the session through `completeSession`, which
 * computes the verdict and pays the rest.
 */
export async function moveBlock(input: z.input<typeof MoveInput>): Promise<MoveResult> {
  const parsed = MoveInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const { sessionId, from, direction } = parsed.data;

  const open = await loadOpenSession(sessionId);
  if (!open) return { ok: false, error: "closed" };
  if (open.session.currentBlock !== from) return { ok: false, error: "moved" };

  const result = step(from, direction, isBlockComplete(from, open.counts, open.progress));
  if (!result.ok) return result;
  if (result.to === "done") {
    const completed = await completeSession(sessionId, open.session.studentId);
    if (!completed.ok) return { ok: false, error: COMPLETE_ERRORS[completed.error] };
    return { ok: true, to: "done", summary: completed.summary };
  }
  const times = leaveBlock(open.session.blockElapsedMs, from, open.session.blockStartedAt);
  const xp = direction === "next" ? blockXp(from, open) : null;
  const moved = await moveSession(sessionId, from, result.to, times, xp);
  if (!moved) return { ok: false, error: "moved" };
  return { ok: true, to: result.to, elapsedMs: times[result.to] ?? 0 };
}

/** Characters per second of composing; anything faster than a second counts as one second. */
function charsPerSecond(text: string, durationMs: number): number {
  return (text.length * 1000) / Math.max(durationMs, 1000);
}

/**
 * Grades the student's explain-back of their assigned problem and records it with its integrity
 * signals. The server picks the problem, numbers the attempt, and applies the pass rule to the
 * grader's scores; a grader that is unreachable or returns anything malformed is "unavailable",
 * never a pass.
 */
export async function submitExplanation(
  input: z.input<typeof ExplainInput>,
): Promise<ExplainSubmitResult> {
  const parsed = ExplainInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const { sessionId, text, source, pasted, durationMs } = parsed.data;

  const [open, calls] = await Promise.all([loadOpenSession(sessionId), graderCalls(sessionId)]);
  if (!open) return { ok: false, error: "closed" };
  if (open.session.currentBlock !== "explain") return { ok: false, error: "wrong-block" };
  if (isExplainFinal(open.progress.explainBack)) return { ok: false, error: "graded" };
  if (!coachConfigured()) return { ok: false, error: "unavailable" };
  if (calls >= GRADER_CALLS_PER_SESSION) return { ok: false, error: "rate-limited" };

  const { problem, results } = open.explain;
  const graded = await gradeExplanation(coachContext(problem, open.session.interests), text);
  const usage = graded.calls.map((call) => ({
    kind: "explain_back" as const,
    model: GRADER_MODEL,
    sessionLogId: sessionId,
    ...call,
  }));
  if (!graded.ok) {
    await recordGraderCalls(usage);
    return { ok: false, error: "unavailable" };
  }

  const { scores, feedback } = graded.grade;
  const result: ExplainResult = {
    attempt: open.explain.attempts + 1,
    scores,
    feedback,
    verdict: passes(scores) ? "pass" : "fail",
  };
  const recorded = await recordExplainBack(
    {
      sessionLogId: sessionId,
      block: problem.block,
      problemIndex: problem.index,
      attempt: result.attempt,
      text,
      source,
      ...scores,
      feedback,
      verdict: result.verdict,
      pasted,
      durationMs,
      charsPerSecond: charsPerSecond(text, durationMs),
    },
    usage,
  );
  if (!recorded) return { ok: false, error: "graded" };
  const verdicts = [...results.map((r) => r.verdict), result.verdict];
  return { ok: true, result, status: explainStatus(verdicts) };
}
