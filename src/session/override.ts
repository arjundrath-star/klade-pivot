import { isExplainFinal } from "@/coach/rubric";
import { recordOverride } from "@/db/queries/explain";
import { findTodaySession } from "@/db/queries/sessions";
import { loadSession, type LoadedSession } from "@/session/load";

export type OverrideError = "no-session" | "wrong-block" | "graded";

type OverrideTarget = { ok: true; loaded: LoadedSession } | { ok: false; error: OverrideError };

/**
 * The session an explain-back override would pass: the student's open session, waiting on an
 * explain-back that is not final yet.
 */
export async function overrideTarget(studentId: string): Promise<OverrideTarget> {
  const today = await findTodaySession(studentId);
  if (today.kind !== "open") return { ok: false, error: "no-session" };
  const loaded = await loadSession(today.sessionId, studentId);
  if (loaded?.session.status !== "in_progress") return { ok: false, error: "no-session" };
  if (loaded.session.currentBlock !== "explain") return { ok: false, error: "wrong-block" };
  if (isExplainFinal(loaded.progress.explainBack)) return { ok: false, error: "graded" };
  return { ok: true, loaded };
}

/**
 * Passes the open session's explain-back without grading, so a grader outage cannot stall a live
 * demo. The row is tagged `override` wherever the parent sees it and is never shown to the student.
 */
export async function overrideExplainBack(
  studentId: string,
): Promise<{ ok: true } | { ok: false; error: OverrideError }> {
  const target = await overrideTarget(studentId);
  if (!target.ok) return target;
  const { session, explain } = target.loaded;
  const recorded = await recordOverride({
    sessionLogId: session.id,
    block: explain.problem.block,
    problemIndex: explain.problem.index,
    attempt: explain.attempts + 1,
  });
  return recorded ? { ok: true } : { ok: false, error: "graded" };
}
