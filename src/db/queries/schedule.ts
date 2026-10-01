import { and, asc, desc, eq, inArray, isNotNull } from "drizzle-orm";
import { getDb } from "@/db/client";
import { sessionLogs, sessionTemplates, units } from "@/db/schema";
import type { ScheduleSlot } from "@/parent/progress";

/** Every day on the student's schedule and whether it was marked missed. */
export async function scheduleSlots(studentId: string): Promise<ScheduleSlot[]> {
  const db = await getDb();
  const rows = await db
    .select({ day: sessionLogs.scheduledFor, status: sessionLogs.status })
    .from(sessionLogs)
    .where(
      and(
        eq(sessionLogs.studentId, studentId),
        isNotNull(sessionLogs.scheduledFor),
        inArray(sessionLogs.status, ["scheduled", "missed"]),
      ),
    );
  // The where clause guarantees both narrowings; the row type cannot express them.
  return rows.flatMap(({ day, status }) =>
    day !== null && (status === "scheduled" || status === "missed") ? [{ day, status }] : [],
  );
}

/** When the student's completed sessions finished and when their open session started. */
export async function sessionActivity(studentId: string) {
  const db = await getDb();
  const rows = await db
    .select({
      status: sessionLogs.status,
      startedAt: sessionLogs.startedAt,
      completedAt: sessionLogs.completedAt,
    })
    .from(sessionLogs)
    .where(
      and(
        eq(sessionLogs.studentId, studentId),
        inArray(sessionLogs.status, ["in_progress", "done"]),
      ),
    );
  return {
    completed: rows.flatMap(({ status, completedAt }) =>
      status === "done" && completedAt ? [completedAt] : [],
    ),
    opened: rows.flatMap(({ status, startedAt }) =>
      status === "in_progress" && startedAt ? [startedAt] : [],
    ),
  };
}

async function endConcept(end: "first" | "last"): Promise<string> {
  const order = end === "first" ? asc : desc;
  const db = await getDb();
  const [concept] = await db
    .select({ id: sessionTemplates.id })
    .from(sessionTemplates)
    .innerJoin(units, eq(units.id, sessionTemplates.unitId))
    .orderBy(order(units.position), order(sessionTemplates.position))
    .limit(1);
  if (!concept) throw new Error("The curriculum has no sessions");
  return concept.id;
}

/** The course's first concept, where a new student's schedule starts. */
export function firstConcept(): Promise<string> {
  return endConcept("first");
}

/** The course's last concept, for a schedule row once every concept is mastered. */
export function lastConcept(): Promise<string> {
  return endConcept("last");
}

interface MissedDay {
  studentId: string;
  /** YYYY-MM-DD */
  day: string;
  sessionTemplateId: string;
  seed: number;
}

/**
 * Marks the student's schedule row for `day` missed, adding the row first when the schedule has
 * none for that day. A row written ahead of time takes `sessionTemplateId`, the concept the student
 * is on now. Returns the row's id, or null when the day was already marked missed.
 */
export async function markDayMissed({
  studentId,
  day,
  sessionTemplateId,
  seed,
}: MissedDay): Promise<string | null> {
  const db = await getDb();
  const [, missed] = await db.batch([
    db
      .insert(sessionLogs)
      .values({ studentId, sessionTemplateId, status: "scheduled", seed, scheduledFor: day })
      .onConflictDoNothing(),
    db
      .update(sessionLogs)
      .set({ status: "missed", sessionTemplateId })
      .where(
        and(
          eq(sessionLogs.studentId, studentId),
          eq(sessionLogs.scheduledFor, day),
          eq(sessionLogs.status, "scheduled"),
        ),
      )
      .returning({ id: sessionLogs.id }),
  ]);
  return missed[0]?.id ?? null;
}
