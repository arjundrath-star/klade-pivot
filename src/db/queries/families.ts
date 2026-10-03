import { inArray, type SQL } from "drizzle-orm";
import type { LibSQLDatabase } from "drizzle-orm/libsql";
import type { SQLiteColumn, SQLiteTable } from "drizzle-orm/sqlite-core";
import {
  aiUsage,
  alerts,
  attempts,
  badges,
  coachTurns,
  exitShown,
  explainBacks,
  families,
  lockRules,
  mastery,
  mentorAssignments,
  mentors,
  rewardProgress,
  rewardUnlocks,
  sessionLogs,
  students,
  xpEvents,
} from "@/db/schema";

/** What ties a table's rows to a family: the family itself, one of its students, or a session. */
type FamilyScope = "family" | "student" | "session";

interface FamilyTable {
  table: SQLiteTable;
  /** The column that names the family, the student or the session a row belongs to. */
  column: SQLiteColumn;
  by: FamilyScope;
}

/**
 * Every table a family owns rows in, children before parents, so one batch of deletes in this
 * order takes a family out whole. A unit test checks this list, `SHARED_TABLES` and the
 * curriculum tables together cover the schema, so a new table cannot leave rows behind by
 * accident.
 */
export const FAMILY_TABLES: readonly FamilyTable[] = [
  { table: aiUsage, column: aiUsage.sessionLogId, by: "session" },
  { table: coachTurns, column: coachTurns.sessionLogId, by: "session" },
  { table: rewardUnlocks, column: rewardUnlocks.studentId, by: "student" },
  { table: rewardProgress, column: rewardProgress.studentId, by: "student" },
  { table: mentorAssignments, column: mentorAssignments.studentId, by: "student" },
  { table: badges, column: badges.studentId, by: "student" },
  { table: xpEvents, column: xpEvents.studentId, by: "student" },
  { table: alerts, column: alerts.familyId, by: "family" },
  { table: mastery, column: mastery.studentId, by: "student" },
  { table: explainBacks, column: explainBacks.sessionLogId, by: "session" },
  { table: exitShown, column: exitShown.sessionLogId, by: "session" },
  { table: attempts, column: attempts.studentId, by: "student" },
  { table: sessionLogs, column: sessionLogs.studentId, by: "student" },
  { table: lockRules, column: lockRules.studentId, by: "student" },
  { table: students, column: students.familyId, by: "family" },
  { table: families, column: families.id, by: "family" },
];

/** Rows every family shares: the mentors (prototype), which the seed upserts. */
export const SHARED_TABLES = [mentors] as const;

/**
 * The ids of the families `filter` selects, of their students and of their sessions, as
 * subqueries: what a row of each family-owned table is scoped by. The filter is never optional:
 * `where(undefined)` would mean every family.
 */
export function familyScope(db: LibSQLDatabase, filter: SQL) {
  const family = db.select({ id: families.id }).from(families).where(filter);
  const student = db
    .select({ id: students.id })
    .from(students)
    .where(inArray(students.familyId, family));
  const session = db
    .select({ id: sessionLogs.id })
    .from(sessionLogs)
    .where(inArray(sessionLogs.studentId, student));
  return { family, student, session };
}

/**
 * Delete statements for every row of the families `filter` selects, in `FAMILY_TABLES` order,
 * for one batch. The scope's subqueries still resolve until the parents go last.
 */
export function familyDeletes(db: LibSQLDatabase, filter: SQL) {
  const scope = familyScope(db, filter);
  const [first, ...rest] = FAMILY_TABLES.map(({ table, column, by }) =>
    db.delete(table).where(inArray(column, scope[by])),
  );
  return [first, ...rest] as const;
}
