import { and, desc, eq, inArray, isNotNull } from "drizzle-orm";
import { getDb } from "@/db/client";
import { families, lockRules, sessionLogs, students } from "@/db/schema";
import type { Weekday } from "@/engine/pace";
import type { LockCategory, LockRule, LockRuleFields } from "@/session/lock";

const RULE_COLUMNS = {
  enabled: lockRules.enabled,
  days: lockRules.days,
  startTime: lockRules.startTime,
  categories: lockRules.categories,
  weekendOff: lockRules.weekendOff,
  overrideUntil: lockRules.overrideUntil,
};

/** The rule's columns left-joined onto the student: all null when the student has no rule. */
interface JoinedRule {
  enabled: boolean | null;
  days: Weekday[] | null;
  startTime: string | null;
  categories: LockCategory[] | null;
  weekendOff: boolean | null;
  overrideUntil: Date | null;
}

function ruleOf(row: JoinedRule): LockRule | null {
  const { enabled, days, startTime, categories, weekendOff, overrideUntil } = row;
  if (enabled === null || days === null || startTime === null || categories === null) return null;
  return { enabled, days, startTime, categories, weekendOff: weekendOff === true, overrideUntil };
}

/** The family's students, for scoping a write to them. */
function familyStudents(db: Awaited<ReturnType<typeof getDb>>, familyId: string) {
  return db.select({ id: students.id }).from(students).where(eq(students.familyId, familyId));
}

/**
 * What the lock decides from for one student: the rule (null without one), the student's
 * weekdays, and the family's demo clock. The lock status is the only caller.
 */
export async function lockInputs(studentId: string) {
  const db = await getDb();
  const [row] = await db
    .select({
      sessionDays: students.sessionDays,
      demoClock: families.demoClock,
      ...RULE_COLUMNS,
    })
    .from(students)
    .innerJoin(families, eq(families.id, students.familyId))
    .leftJoin(lockRules, eq(lockRules.studentId, students.id))
    .where(eq(students.id, studentId));
  if (!row) return undefined;
  return { sessionDays: row.sessionDays, demoClock: row.demoClock, rule: ruleOf(row) };
}

/** One of the family's students with their phone rule, and the plan's days and start time. */
export async function lockSettings(familyId: string, studentId: string) {
  const db = await getDb();
  const [row] = await db
    .select({
      name: students.name,
      sessionDays: students.sessionDays,
      sessionTime: students.sessionTime,
      ...RULE_COLUMNS,
    })
    .from(students)
    .leftJoin(lockRules, eq(lockRules.studentId, students.id))
    .where(and(eq(students.id, studentId), eq(students.familyId, familyId)));
  if (!row) return undefined;
  const { name, sessionDays, sessionTime } = row;
  return { name, sessionDays, sessionTime, rule: ruleOf(row) };
}

/** The student's most recently finished session, if any. */
export async function lastCompletion(studentId: string) {
  const db = await getDb();
  const [row] = await db
    .select({ id: sessionLogs.id, completedAt: sessionLogs.completedAt })
    .from(sessionLogs)
    .where(
      and(
        eq(sessionLogs.studentId, studentId),
        eq(sessionLogs.status, "done"),
        isNotNull(sessionLogs.completedAt),
      ),
    )
    .orderBy(desc(sessionLogs.completedAt))
    .limit(1);
  return row?.completedAt ? { id: row.id, completedAt: row.completedAt } : undefined;
}

/**
 * Creates the student's rule, switched on, or replaces the edited fields of the one they have.
 * Tonight's unlock and the switch stay as they were. False when the student is not the family's.
 */
export async function saveLockRule(
  familyId: string,
  studentId: string,
  fields: LockRuleFields,
): Promise<boolean> {
  const db = await getDb();
  const [owned] = await db
    .select({ id: students.id })
    .from(students)
    .where(and(eq(students.id, studentId), eq(students.familyId, familyId)));
  if (!owned) return false;
  const updatedAt = new Date();
  await db
    .insert(lockRules)
    .values({ studentId, enabled: true, ...fields, updatedAt })
    .onConflictDoUpdate({ target: lockRules.studentId, set: { ...fields, updatedAt } });
  return true;
}

type RuleChange = Partial<Pick<typeof lockRules.$inferInsert, "enabled" | "overrideUntil">>;

/** Changes the rule of one of the family's students. False when there is no such rule. */
async function changeRule(familyId: string, studentId: string, change: RuleChange) {
  const db = await getDb();
  const updated = await db
    .update(lockRules)
    .set({ ...change, updatedAt: new Date() })
    .where(
      and(
        eq(lockRules.studentId, studentId),
        inArray(lockRules.studentId, familyStudents(db, familyId)),
      ),
    )
    .returning({ id: lockRules.id });
  return updated.length > 0;
}

/** The parent's master switch. */
export function setLockEnabled(familyId: string, studentId: string, enabled: boolean) {
  return changeRule(familyId, studentId, { enabled });
}

/** The parent's "Unlock tonight": nothing locks before `until`. */
export function setLockOverride(familyId: string, studentId: string, until: Date) {
  return changeRule(familyId, studentId, { overrideUntil: until });
}

/**
 * Sets the family's demo clock, or clears it with null, and drops any running unlock on the
 * family's rules, so every demo run starts locked. False when there is no such family.
 */
export async function resetDemoClock(familyId: string, at: Date | null): Promise<boolean> {
  const db = await getDb();
  const [updated] = await db.batch([
    db
      .update(families)
      .set({ demoClock: at })
      .where(eq(families.id, familyId))
      .returning({ id: families.id }),
    db
      .update(lockRules)
      .set({ overrideUntil: null })
      .where(inArray(lockRules.studentId, familyStudents(db, familyId))),
  ]);
  return updated.length > 0;
}
