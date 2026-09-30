"use server";

import { z } from "zod";
import { recordAttempt } from "@/db/queries/attempts";
import { DEMO_STUDENT_ID } from "@/db/demo";
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
import { loadSession, openProblem, type OpenProblemError } from "@/session/load";
import { leaveBlock } from "@/session/timer";

// Longer gaps (a tab left open overnight) are recorded as an hour rather than rejected.
const MAX_ATTEMPT_MS = 60 * 60 * 1000;

const AnswerInput = z.object({
  sessionId: z.uuid(),
  block: z.enum(ANSWERED_BLOCK_IDS),
  index: z.int().nonnegative(),
  answer: z.string().max(40),
  timeMs: z
    .int()
    .nonnegative()
    .transform((ms) => Math.min(ms, MAX_ATTEMPT_MS)),
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

const LessonInput = z.object({ sessionId: z.uuid() });

export type LessonResult = { ok: true } | { ok: false; error: "invalid" | "closed" };

const MoveInput = z.object({
  sessionId: z.uuid(),
  from: z.enum(BLOCK_IDS),
  direction: z.enum(["next", "back"]),
});

export type MoveResult =
  /** `elapsedMs` is the time already spent in `to` on earlier visits. */
  | { ok: true; to: BlockId | "done"; elapsedMs: number }
  | { ok: false; error: "invalid" | "closed" | "moved" | "incomplete" | "first-block" };

// Sign-in is not built yet, so every session action acts as the demo student.
async function loadOpenSession(sessionId: string) {
  const loaded = await loadSession(sessionId, DEMO_STUDENT_ID);
  return loaded?.session.status === "in_progress" ? loaded : undefined;
}

/** Grades one answer and records it as an attempt. Malformed input is answered but not recorded. */
export async function submitAnswer(input: z.input<typeof AnswerInput>): Promise<AnswerResult> {
  const parsed = AnswerInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const { sessionId, block, index, answer, timeMs } = parsed.data;

  const opened = await openProblem(sessionId, DEMO_STUDENT_ID, block, index);
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
 * Records that the student read the lesson, which unlocks Next out of the learn block. "closed"
 * means the session is not open on the learn block, for example because another tab moved it.
 */
export async function confirmLesson(input: z.input<typeof LessonInput>): Promise<LessonResult> {
  const parsed = LessonInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const marked = await markLessonRead(parsed.data.sessionId, DEMO_STUDENT_ID);
  return marked ? { ok: true } : { ok: false, error: "closed" };
}

/** Moves the session one block. The server decides whether the current block is complete. */
export async function moveBlock(input: z.input<typeof MoveInput>): Promise<MoveResult> {
  const parsed = MoveInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const { sessionId, from, direction } = parsed.data;

  const open = await loadOpenSession(sessionId);
  if (!open) return { ok: false, error: "closed" };
  if (open.session.currentBlock !== from) return { ok: false, error: "moved" };

  const result = step(from, direction, isBlockComplete(from, open.counts, open.progress));
  if (!result.ok) return result;
  const times = leaveBlock(open.session.blockElapsedMs, from, open.session.blockStartedAt);
  const moved = await moveSession(sessionId, from, result.to, times);
  if (!moved) return { ok: false, error: "moved" };
  return { ok: true, to: result.to, elapsedMs: result.to === "done" ? 0 : (times[result.to] ?? 0) };
}
