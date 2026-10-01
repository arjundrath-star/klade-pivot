import { randomInt } from "node:crypto";
import { recordAlert } from "@/db/queries/alerts";
import { lastConcept, markDayMissed, sessionActivity } from "@/db/queries/schedule";
import { findTodaySession } from "@/db/queries/sessions";
import { getStudent } from "@/db/queries/students";
import { missedSessionMessage } from "@/parent/alerts";
import { calendarDay } from "@/parent/progress";
import { studentPace } from "@/session/pace";

/** The concept today's session is for: the one the planner would open, else the course's last. */
async function todaysConcept(studentId: string): Promise<string> {
  const today = await findTodaySession(studentId);
  return today.kind === "complete" ? lastConcept() : today.templateId;
}

type MissedResult =
  | { ok: true; behind: number }
  | { ok: false; error: "not-found" | "done-today" | "open-today" | "already-missed" };

/**
 * Marks the student's scheduled session for today missed and raises the same-day alert with the
 * behind count it leaves. A day with a session finished or still open on it cannot be missed, and
 * a day already marked missed raises no second alert.
 */
export async function markTodayMissed(studentId: string, now = new Date()): Promise<MissedResult> {
  const today = calendarDay(now);
  const isToday = (at: Date) => calendarDay(at) === today;
  const [student, activity, concept] = await Promise.all([
    getStudent(studentId),
    sessionActivity(studentId),
    todaysConcept(studentId),
  ]);
  if (!student) return { ok: false, error: "not-found" };
  if (activity.completed.some(isToday)) return { ok: false, error: "done-today" };
  if (activity.opened.some(isToday)) return { ok: false, error: "open-today" };

  const missedId = await markDayMissed({
    studentId,
    day: today,
    sessionTemplateId: concept,
    seed: randomInt(0, 2 ** 32),
  });
  if (missedId === null) return { ok: false, error: "already-missed" };
  const behind = await studentPace(studentId, now);
  await recordAlert({
    familyId: student.familyId,
    studentId,
    type: "missed",
    sessionLogId: missedId,
    message: missedSessionMessage(student.name, student.pronoun, behind, student.targetDate),
  });
  return { ok: true, behind };
}
