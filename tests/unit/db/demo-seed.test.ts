import { randomUUID } from "node:crypto";
import { eq, getTableName, is } from "drizzle-orm";
import { SQLiteTable } from "drizzle-orm/sqlite-core";
import { describe, expect, it } from "vitest";
import { getDb } from "@/db/client";
import {
  CURRICULUM_TABLES,
  DEMO_FAMILY_ID,
  DEMO_LOCK_RULE,
  DEMO_RESET_TABLES,
  DEMO_STUDENT_ID,
  resetDemoData,
  S1_TEMPLATE_ID,
} from "@/db/demo";
import { familyAlerts } from "@/db/queries/alerts";
import { lockInputs, lockSettings, resetDemoClock, setLockOverride } from "@/db/queries/lock";
import { mentorFor } from "@/db/queries/mentor";
import { rewardRows } from "@/db/queries/reward-progress";
import { studentEarnings } from "@/db/queries/rewards";
import { scheduleSlots } from "@/db/queries/schedule";
import { findTodaySession } from "@/db/queries/sessions";
import { createFamily, getStudent, setInterests } from "@/db/queries/students";
import * as schema from "@/db/schema";
import { families, students } from "@/db/schema";
import { markTodayMissed } from "@/session/alerts";
import { completeSession } from "@/session/complete";
import { studentPace } from "@/session/pace";
import { sessionAtExit } from "../../helpers/answers";
import { answerExit, withTempDatabase } from "../../helpers/database";

// Friday Oct 2, 2026 at noon in New York: the demo day, which is not one of Maya's session days.
const DEMO_DAY = new Date("2026-10-02T16:00:00Z");

// Today plus Maya's Mon/Tue/Thu/Sun over the next two weeks.
const DEMO_SCHEDULE = [
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

  it("puts today and the next two weeks of session days on the schedule, once", async () => {
    await resetDemoData(DEMO_DAY);
    expect(await scheduledDays()).toEqual(DEMO_SCHEDULE);
    await resetDemoData(DEMO_DAY);
    expect(await scheduledDays()).toEqual(DEMO_SCHEDULE);
    // Nothing is owed yet: the schedule starts today.
    expect(await studentPace(DEMO_STUDENT_ID, DEMO_DAY)).toBe(0);
  });

  it("switches the phone rule on with no unlock running", async () => {
    const settings = await lockSettings(DEMO_FAMILY_ID, DEMO_STUDENT_ID);
    expect(settings?.rule).toEqual({ enabled: true, overrideUntil: null, ...DEMO_LOCK_RULE });
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
    expect((await studentEarnings(DEMO_STUDENT_ID)).xp).toBeGreaterThan(0);
    expect(await findTodaySession(DEMO_STUDENT_ID)).toEqual({ kind: "complete" });

    const started = Date.now();
    await resetDemoData(DEMO_DAY);
    expect(Date.now() - started).toBeLessThan(5000);

    expect(await studentEarnings(DEMO_STUDENT_ID)).toEqual({
      xp: 0,
      badges: new Set(),
      mastered: new Set(),
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
    const streak = (await rewardRows(DEMO_STUDENT_ID)).find((row) => row.key === "streak-4-weeks");
    expect(streak).toMatchObject({ current: 3, target: 4, unlocked: false });
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
