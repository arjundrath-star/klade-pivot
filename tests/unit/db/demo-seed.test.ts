import { randomUUID } from "node:crypto";
import { eq, getTableName, is } from "drizzle-orm";
import { SQLiteTable } from "drizzle-orm/sqlite-core";
import { describe, expect, it } from "vitest";
import { ALGEBRA1_COURSE } from "@/content/algebra1/course";
import { rewardBoard } from "@/content/rewards";
import { S1_KEY } from "@/content/keys";
import { getDb } from "@/db/client";
import {
  CURRICULUM_TABLES,
  DEMO_FAMILY_ID,
  DEMO_LOCK_RULE,
  DEMO_MASTERED_KEYS,
  DEMO_RESET_TABLES,
  DEMO_STUDENT_ID,
  resetDemoData,
  S1_TEMPLATE_ID,
  templateIdFor,
} from "@/db/demo";
import { familyAlerts } from "@/db/queries/alerts";
import { lockInputs, lockSettings, resetDemoClock, setLockOverride } from "@/db/queries/lock";
import { mentorFor } from "@/db/queries/mentor";
import { latestExplanation, masteryGrid, sessionHistory } from "@/db/queries/parent";
import { rewardRows } from "@/db/queries/reward-progress";
import { studentEarnings } from "@/db/queries/rewards";
import { scheduleSlots } from "@/db/queries/schedule";
import { findTodaySession } from "@/db/queries/sessions";
import { createFamily, getStudent, setInterests } from "@/db/queries/students";
import * as schema from "@/db/schema";
import {
  families,
  mastery,
  rewardUnlocks,
  sessionTemplates,
  students,
  xpEvents,
} from "@/db/schema";
import { courseProgress, nextConcept } from "@/engine/course";
import { conceptBadgeKey, level, unitBadgeKey } from "@/engine/progress";
import { historyMinutes } from "@/parent/history";
import { calendarDay } from "@/parent/progress";
import { markTodayMissed } from "@/session/alerts";
import { completeSession } from "@/session/complete";
import { studentPace, studentStanding } from "@/session/pace";
import { sessionAtExit } from "../../helpers/answers";
import { answerExit, withTempDatabase } from "../../helpers/database";

// Friday Oct 2, 2026 at noon in New York: the demo day, which is not one of Maya's session days.
const DEMO_DAY = new Date("2026-10-02T16:00:00Z");

// Maya's last five session days before the demo day, Mon/Tue/Thu/Sun: one per mastered concept.
const HISTORY_DAYS = ["2026-09-24", "2026-09-27", "2026-09-28", "2026-09-29", "2026-10-01"];

// Her record, today, and her Mon/Tue/Thu/Sun over the next two weeks.
const DEMO_SCHEDULE = [
  ...HISTORY_DAYS,
  "2026-10-02",
  "2026-10-04",
  "2026-10-05",
  "2026-10-06",
  "2026-10-08",
  "2026-10-11",
  "2026-10-12",
  "2026-10-13",
  "2026-10-15",
];

/** XP one seeded session pays: the same as a full live session of the shipped shape. */
const SESSION_XP = 110;

/** What a seeded re-run leaves and Reset demo restores: the persona as the demo starts. */
const PERSONA_BADGES = [...DEMO_MASTERED_KEYS.map(conceptBadgeKey), unitBadgeKey(1), "streak-5"];

withTempDatabase("klade-demo-seed-", DEMO_DAY);

async function scheduledDays(): Promise<string[]> {
  const slots = await scheduleSlots(DEMO_STUDENT_ID);
  expect(slots.every((slot) => slot.status === "scheduled")).toBe(true);
  return slots.map((slot) => slot.day).sort();
}

describe("the demo seed", () => {
  it("gives the parent a name other than the mentor's", async () => {
    const db = await getDb();
    const [family] = await db.select().from(families).where(eq(families.id, DEMO_FAMILY_ID));
    const mentor = await mentorFor(DEMO_STUDENT_ID);
    expect(family.parentName).not.toBe(mentor?.name);
  });

  it("writes the course's units and one template per concept, playable only for two-step", async () => {
    const db = await getDb();
    const templates = await db
      .select({ id: sessionTemplates.id, playable: sessionTemplates.playable })
      .from(sessionTemplates);
    expect(templates).toHaveLength(49);
    expect(templates.filter((row) => row.playable).map((row) => row.id)).toEqual([S1_TEMPLATE_ID]);
    const grid = await masteryGrid(DEMO_STUDENT_ID);
    expect(grid.map((row) => row.contentKey)).toEqual(
      ALGEBRA1_COURSE.flatMap((unit) => unit.concepts.map((concept) => concept.key)),
    );
  });

  it("puts her record, today and the next two weeks of session days on the schedule, once", async () => {
    await resetDemoData(DEMO_DAY);
    expect(await scheduledDays()).toEqual(DEMO_SCHEDULE);
    await resetDemoData(DEMO_DAY);
    expect(await scheduledDays()).toEqual(DEMO_SCHEDULE);
    // Nothing is owed: every past schedule day has its session.
    expect(await studentPace(DEMO_STUDENT_ID, DEMO_DAY)).toBe(0);
  });

  it("switches the phone rule on with no unlock running", async () => {
    const settings = await lockSettings(DEMO_FAMILY_ID, DEMO_STUDENT_ID);
    expect(settings?.rule).toEqual({ enabled: true, overrideUntil: null, ...DEMO_LOCK_RULE });
  });
});

describe("the demo persona", () => {
  it("has mastered every concept before two-step equations, 5 of 49, with the records to match", async () => {
    expect(DEMO_MASTERED_KEYS).toEqual(
      ALGEBRA1_COURSE.flatMap((unit) => unit.concepts.map((concept) => concept.key)).slice(0, 5),
    );
    const earnings = await studentEarnings(DEMO_STUDENT_ID);
    expect(earnings.mastered).toEqual(new Set(DEMO_MASTERED_KEYS));
    expect(earnings.xp).toBe(SESSION_XP * DEMO_MASTERED_KEYS.length);
    expect([...earnings.badges].sort()).toEqual([...PERSONA_BADGES].sort());
    expect(level(ALGEBRA1_COURSE, earnings.mastered)).toBe(2);
    expect(courseProgress(ALGEBRA1_COURSE, earnings.mastered)).toEqual({
      mastered: 5,
      total: 49,
      percent: 10,
      unitsDone: 1,
      units: 9,
    });
  });

  it("has one finished session per mastered concept, on its day, with its minutes and XP", async () => {
    const history = await sessionHistory(DEMO_STUDENT_ID);
    expect(history).toHaveLength(DEMO_MASTERED_KEYS.length);
    const byDay = history.toSorted(
      (a, b) => (a.startedAt?.getTime() ?? 0) - (b.startedAt?.getTime() ?? 0),
    );
    byDay.forEach((row, index) => {
      expect(row).toMatchObject({ status: "done", outcome: "mastered" });
      expect(row.startedAt && calendarDay(row.startedAt)).toBe(HISTORY_DAYS[index]);
      expect(row.completedAt && calendarDay(row.completedAt)).toBe(HISTORY_DAYS[index]);
      expect(historyMinutes(row)).toBeGreaterThanOrEqual(29);
      expect(historyMinutes(row)).toBeLessThanOrEqual(31);
    });
    const db = await getDb();
    const masteryRows = await db
      .select({
        templateId: mastery.sessionTemplateId,
        status: mastery.status,
        exitScore: mastery.exitScore,
        exitTotal: mastery.exitTotal,
      })
      .from(mastery)
      .where(eq(mastery.studentId, DEMO_STUDENT_ID));
    expect(masteryRows).toHaveLength(DEMO_MASTERED_KEYS.length);
    for (const row of masteryRows) {
      expect(row).toMatchObject({ status: "mastered", exitScore: 3, exitTotal: 3 });
    }
    expect(masteryRows.map((row) => row.templateId).sort()).toEqual(
      DEMO_MASTERED_KEYS.map(templateIdFor).sort(),
    );
    const xp = await db
      .select({ amount: xpEvents.amount })
      .from(xpEvents)
      .where(eq(xpEvents.studentId, DEMO_STUDENT_ID));
    expect(xp).toHaveLength(4 * DEMO_MASTERED_KEYS.length);
    // No explanation is seeded: her words come from the live session.
    expect(await latestExplanation(DEMO_STUDENT_ID)).toBeUndefined();
  });

  it("stands at a 5-session streak, on track, with the 4-week streak reward at 3 of 4", async () => {
    const standing = await studentStanding(DEMO_STUDENT_ID, DEMO_DAY);
    expect(standing).toEqual({
      behind: 0,
      streak: { count: 5, untilFreeze: 0 },
      streakWeeks: 2,
      streakBroken: false,
      sessionsDone: 5,
    });
    const board = rewardBoard(await rewardRows(DEMO_STUDENT_ID), standing);
    expect(
      board.map(({ reward, current, target, unlocked }) => [reward.key, current, target, unlocked]),
    ).toEqual([
      ["course-on-time", 5, 120, false],
      ["unit-on-time", 5, ALGEBRA1_COURSE[0].sessions, false],
      ["streak-4-weeks", 3, 4, false],
      ["intensive-pace", 0, 4, false],
    ]);
    // Rewards read her sessions live; the record unlocks none of them.
    const db = await getDb();
    expect(await db.select({ key: rewardUnlocks.key }).from(rewardUnlocks)).toEqual([]);
  });

  it("is on two-step equations today, and after it the next concept is not built", async () => {
    expect(await findTodaySession(DEMO_STUDENT_ID)).toEqual({
      kind: "next",
      templateId: S1_TEMPLATE_ID,
      title: "Solving two-step linear equations",
      contentKey: S1_KEY,
      repeat: false,
    });
    const after = new Set([...DEMO_MASTERED_KEYS, S1_KEY]);
    expect(nextConcept(ALGEBRA1_COURSE, after)).toMatchObject({
      position: 7,
      concept: { title: "Equations with variables on both sides", playable: false },
    });
  });
});

describe("Reset demo", () => {
  it("empties every table the schema has, except the curriculum", () => {
    const tables = Object.values(schema)
      .flatMap((value) => (is(value, SQLiteTable) ? [getTableName(value)] : []))
      .sort();
    const covered = [...DEMO_RESET_TABLES, ...CURRICULUM_TABLES].map(getTableName).sort();
    expect(covered).toEqual(tables);
  });

  it("puts everything back to the seeded state", async () => {
    // A run of the demo, with every change a rehearsal can leave behind.
    const sessionId = await sessionAtExit();
    await answerExit(sessionId, [true, true, true]);
    expect(await completeSession(sessionId, DEMO_STUDENT_ID)).toMatchObject({ ok: true });
    await setInterests(DEMO_STUDENT_ID, ["gaming"]);
    await resetDemoClock(DEMO_FAMILY_ID, new Date("2026-10-01T21:05:00Z"));
    await setLockOverride(DEMO_FAMILY_ID, DEMO_STUDENT_ID, new Date("2026-10-03T04:00:00Z"));
    const otherStudent = randomUUID();
    await createFamily(
      "Sam",
      {
        id: otherStudent,
        familyId: randomUUID(),
        name: "Ava",
        grade: 7,
        targetDate: "2027-05-31",
        pacePerWeek: 4,
        interests: ["animals"],
      },
      [{ day: "2026-10-03", sessionTemplateId: S1_TEMPLATE_ID, seed: 7 }],
      null,
    );
    expect((await studentEarnings(DEMO_STUDENT_ID)).xp).toBeGreaterThan(SESSION_XP * 5);
    expect(await findTodaySession(DEMO_STUDENT_ID)).toEqual({ kind: "complete" });

    const started = Date.now();
    await resetDemoData(DEMO_DAY);
    expect(Date.now() - started).toBeLessThan(5000);

    expect(await studentEarnings(DEMO_STUDENT_ID)).toEqual({
      xp: SESSION_XP * DEMO_MASTERED_KEYS.length,
      badges: new Set(PERSONA_BADGES),
      mastered: new Set(DEMO_MASTERED_KEYS),
    });
    expect(await findTodaySession(DEMO_STUDENT_ID)).toMatchObject({
      kind: "next",
      templateId: S1_TEMPLATE_ID,
    });
    expect(await scheduledDays()).toEqual(DEMO_SCHEDULE);
    expect((await getStudent(DEMO_STUDENT_ID))?.interests).toEqual(["sports", "music"]);
    expect((await lockInputs(DEMO_STUDENT_ID))?.demoClock).toBeNull();
    expect((await lockSettings(DEMO_FAMILY_ID, DEMO_STUDENT_ID))?.rule).toEqual({
      enabled: true,
      overrideUntil: null,
      ...DEMO_LOCK_RULE,
    });
    const rows = await rewardRows(DEMO_STUDENT_ID);
    // One seeded week before the two her record spans: 3 of 4 on the board.
    expect(rows.find((row) => row.key === "streak-4-weeks")).toMatchObject({
      current: 1,
      target: 4,
      unlocked: false,
    });
    expect(rows.some((row) => row.unlocked)).toBe(false);
    expect(await familyAlerts(DEMO_FAMILY_ID)).toEqual([]);
    expect(await getStudent(otherStudent)).toBeUndefined();
    const db = await getDb();
    expect(await db.select({ id: students.id }).from(students)).toEqual([{ id: DEMO_STUDENT_ID }]);
  });

  it("clears a missed day and its alert", async () => {
    expect(await markTodayMissed(DEMO_STUDENT_ID, DEMO_DAY)).toEqual({ ok: true, behind: 1 });
    await resetDemoData(DEMO_DAY);
    expect(await studentPace(DEMO_STUDENT_ID, DEMO_DAY)).toBe(0);
    expect(await familyAlerts(DEMO_FAMILY_ID)).toEqual([]);
    expect(await scheduledDays()).toEqual(DEMO_SCHEDULE);
  });
});
