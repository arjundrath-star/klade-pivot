import { randomUUID } from "node:crypto";
import { count, eq, getTableName, inArray } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { getDb } from "@/db/client";
import {
  DEMO_FAMILY_ID,
  DEMO_LOCK_RULE,
  DEMO_MASTERED_KEYS,
  DEMO_SESSION_SEED,
  DEMO_STUDENT_ID,
  resetDemoData,
} from "@/db/demo";
import { FAMILY_TABLES, familyScope } from "@/db/queries/families";
import { lockSettings } from "@/db/queries/lock";
import { mentorFor } from "@/db/queries/mentor";
import { sessionHistory } from "@/db/queries/parent";
import { rewardRows } from "@/db/queries/reward-progress";
import { studentEarnings } from "@/db/queries/rewards";
import { findTodaySession, openTodaySession } from "@/db/queries/sessions";
import { getStudent } from "@/db/queries/students";
import { families, mentors } from "@/db/schema";
import { createVisitor, deleteStaleVisitors, resetVisitor, VISITOR_TTL_MS } from "@/db/visitors";
import { completeSession } from "@/session/complete";
import { loadSession } from "@/session/load";
import { lockView } from "@/session/lock-status";
import { sessionAtExit } from "../../helpers/answers";
import { actAs, answerExit, signIn, withTempDatabase } from "../../helpers/database";

// Friday Oct 2, 2026 at noon in New York: the demo day.
const NOW = new Date("2026-10-02T16:00:00Z");

withTempDatabase("klade-visitors-", NOW);

/** How many rows each family-owned table holds for `familyId`, by table name. */
async function rowCounts(familyId: string): Promise<Record<string, number>> {
  const db = await getDb();
  const scope = familyScope(db, eq(families.id, familyId));
  const counts: Record<string, number> = {};
  for (const { table, column, by } of FAMILY_TABLES) {
    const [row] = await db.select({ n: count() }).from(table).where(inArray(column, scope[by]));
    counts[getTableName(table)] = row.n;
  }
  return counts;
}

async function familyOf(studentId: string): Promise<string> {
  const student = await getStudent(studentId);
  if (!student) throw new Error(`no student ${studentId}`);
  return student.familyId;
}

/**
 * Runs the exit check as `studentId`'s own browser would (a visitor's has no gate cookie; the
 * founder's has no visitor's student cookie), then finishes the session.
 */
async function finishSession(studentId: string): Promise<void> {
  if (studentId === DEMO_STUDENT_ID) await signIn();
  else await actAs(studentId);
  const sessionId = await sessionAtExit("pass", studentId);
  await answerExit(sessionId, [true, true, true]);
  expect(await completeSession(sessionId, studentId)).toMatchObject({ ok: true });
}

/** A fresh visitor's copy, as /demo makes one, and its family id. */
async function visitor(now = NOW): Promise<{ studentId: string; familyId: string }> {
  const studentId = randomUUID();
  expect(await createVisitor(studentId, now)).toBe(true);
  return { studentId, familyId: await familyOf(studentId) };
}

describe("a visitor's copy", () => {
  it("holds the demo persona's starting state, row for row, in its own family", async () => {
    await resetDemoData(NOW);
    const started = Date.now();
    const { studentId, familyId } = await visitor();
    expect(Date.now() - started).toBeLessThan(5000);

    expect(familyId).not.toBe(DEMO_FAMILY_ID);
    expect(await getStudent(studentId)).toMatchObject({
      name: "Maya",
      parentName: "Dana",
      visitor: true,
      interests: ["sports", "music"],
    });
    expect(await rowCounts(familyId)).toEqual(await rowCounts(DEMO_FAMILY_ID));
    expect(await studentEarnings(studentId)).toEqual(await studentEarnings(DEMO_STUDENT_ID));
    expect((await sessionHistory(studentId)).map((row) => row.status)).toEqual(
      Array(DEMO_MASTERED_KEYS.length).fill("done"),
    );
    expect(await rewardRows(studentId)).toEqual(await rewardRows(DEMO_STUDENT_ID));
    expect((await mentorFor(studentId))?.name).toBe("Jordan");
    expect((await lockSettings(familyId, studentId))?.rule).toEqual({
      enabled: true,
      overrideUntil: null,
      ...DEMO_LOCK_RULE,
    });
    expect(await findTodaySession(studentId)).toMatchObject({ kind: "next", repeat: false });
    // The one row that differs: the mentor is shared, so there is still one of him.
    const db = await getDb();
    expect(await db.select({ id: mentors.id }).from(mentors)).toHaveLength(1);
  });

  it("is made once per id", async () => {
    const { studentId, familyId } = await visitor();
    expect(await createVisitor(studentId, NOW)).toBe(false);
    expect(await familyOf(studentId)).toBe(familyId);
  });

  it("starts with the demo clock on, so the phone is locked, and unlocks once the session is done", async () => {
    const { studentId } = await visitor();
    expect(await lockView(studentId, new Date())).toMatchObject({
      locked: true,
      reason: "session-due",
      time: "5:05",
    });
    // Maya's own clock is off until the admin panel sets it.
    expect((await lockView(DEMO_STUDENT_ID, NOW)).time).toBe("12:00");

    await finishSession(studentId);
    expect(await lockView(studentId, new Date())).toMatchObject({
      locked: false,
      reason: "session-done",
    });
  });

  it("runs the demo's session: the fixed seed and two problems a practice block", async () => {
    const { studentId } = await visitor();
    const sessionId = await openTodaySession(studentId, DEMO_SESSION_SEED);
    if (!sessionId) throw new Error("no session opened");
    const loaded = await loadSession(sessionId, studentId);
    expect(loaded?.session.seed).toBe(DEMO_SESSION_SEED);
    expect(loaded?.counts).toEqual({ warmup: 2, guided: 2, exit: 3 });
  });
});

describe("Start the demo over", () => {
  it("puts the copy back to its starting state and touches no other family", async () => {
    await resetDemoData(NOW);
    const start = await rowCounts(DEMO_FAMILY_ID);
    const startEarnings = await studentEarnings(DEMO_STUDENT_ID);
    const copy = await visitor();
    const other = await visitor();

    // A run of the demo in the copy, and one in the other visitor's and in Maya's.
    for (const studentId of [copy.studentId, other.studentId, DEMO_STUDENT_ID]) {
      await finishSession(studentId);
      expect(await findTodaySession(studentId)).toEqual({ kind: "complete" });
    }
    const otherAfterRun = await rowCounts(other.familyId);
    const mayaAfterRun = await rowCounts(DEMO_FAMILY_ID);
    expect(otherAfterRun).not.toEqual(start);

    const started = Date.now();
    expect(await resetVisitor(copy.studentId, NOW)).toBe(true);
    expect(Date.now() - started).toBeLessThan(5000);

    expect(await rowCounts(copy.familyId)).toEqual(start);
    expect(await findTodaySession(copy.studentId)).toMatchObject({ kind: "next" });
    expect(await studentEarnings(copy.studentId)).toEqual(startEarnings);
    expect((await lockView(copy.studentId, new Date())).locked).toBe(true);
    expect(await rowCounts(other.familyId)).toEqual(otherAfterRun);
    expect(await findTodaySession(other.studentId)).toEqual({ kind: "complete" });
    expect(await rowCounts(DEMO_FAMILY_ID)).toEqual(mayaAfterRun);
    expect(await findTodaySession(DEMO_STUDENT_ID)).toEqual({ kind: "complete" });
  });

  it("resets nothing but a visitor's family", async () => {
    await resetDemoData(NOW);
    expect(await resetVisitor(DEMO_STUDENT_ID, NOW)).toBe(false);
    expect(await resetVisitor(randomUUID(), NOW)).toBe(false);
  });
});

describe("the sweep", () => {
  it("removes copies past 48 hours with every row they own, and never the canonical family", async () => {
    await resetDemoData(NOW);
    const db = await getDb();
    const stale = await visitor(new Date(NOW.getTime() - VISITOR_TTL_MS - 1000));
    const fresh = await visitor(new Date(NOW.getTime() - VISITOR_TTL_MS + 60_000));
    // A stale copy with a session run in it, so every table has rows to lose.
    await finishSession(stale.studentId);
    // The canonical family is older than any copy; only `visitor` decides.
    await db
      .update(families)
      .set({ createdAt: new Date(NOW.getTime() - 10 * VISITOR_TTL_MS) })
      .where(eq(families.id, DEMO_FAMILY_ID));
    const maya = await rowCounts(DEMO_FAMILY_ID);

    expect(await deleteStaleVisitors(NOW)).toBe(1);

    const empty = Object.fromEntries(FAMILY_TABLES.map(({ table }) => [getTableName(table), 0]));
    expect(await rowCounts(stale.familyId)).toEqual(empty);
    expect(await getStudent(stale.studentId)).toBeUndefined();
    expect(await rowCounts(fresh.familyId)).toEqual(maya);
    expect(await rowCounts(DEMO_FAMILY_ID)).toEqual(maya);
    expect(await deleteStaleVisitors(NOW)).toBe(0);
    expect(await deleteStaleVisitors(new Date(NOW.getTime() + 120_000))).toBe(1);
    expect(await rowCounts(DEMO_FAMILY_ID)).toEqual(maya);
  });

  it("still removes a copy that keeps starting over: its 48 hours run from the first visit", async () => {
    await resetDemoData(NOW);
    const old = await visitor(new Date(NOW.getTime() - VISITOR_TTL_MS - 1000));
    expect(await resetVisitor(old.studentId, NOW)).toBe(true);
    expect(await getStudent(old.studentId)).toBeDefined();
    expect(await deleteStaleVisitors(NOW)).toBe(1);
    expect(await getStudent(old.studentId)).toBeUndefined();
  });
});

describe("Reset demo with visitors about", () => {
  it("restores Maya and removes onboarded families, and leaves every visitor's copy alone", async () => {
    await resetDemoData(NOW);
    const { studentId, familyId } = await visitor();
    await finishSession(studentId);
    const copy = await rowCounts(familyId);

    await resetDemoData(NOW);
    expect(await rowCounts(familyId)).toEqual(copy);
    expect(await findTodaySession(studentId)).toEqual({ kind: "complete" });
    expect(await findTodaySession(DEMO_STUDENT_ID)).toMatchObject({ kind: "next" });
  });
});
