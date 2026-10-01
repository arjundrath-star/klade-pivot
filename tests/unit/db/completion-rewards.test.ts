import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { getDb } from "@/db/client";
import { DEMO_STUDENT_ID, seedDemo } from "@/db/demo";
import { mentorFor } from "@/db/queries/mentor";
import { rewardRows } from "@/db/queries/reward-progress";
import { getSession } from "@/db/queries/sessions";
import { rewardUnlocks } from "@/db/schema";
import { completeSession } from "@/session/complete";
import { sessionRewards } from "@/session/rewards";
import { removePrototypeRows, scheduleToday, sessionAtExit } from "../../helpers/answers";
import { answerExit, withTempDatabase } from "../../helpers/database";

// Completion rewards and the mentor against a real libSQL file.
withTempDatabase("klade-completion-rewards-", new Date("2026-10-01T12:00:00Z"));

async function unlockRows() {
  const db = await getDb();
  return db
    .select({ key: rewardUnlocks.key, sessionLogId: rewardUnlocks.sessionLogId })
    .from(rewardUnlocks)
    .where(eq(rewardUnlocks.studentId, DEMO_STUDENT_ID));
}

/** Opens a session on the exit check, answers it and finishes it. */
async function finishOne(correct: readonly boolean[] = [true, true, true]) {
  const sessionId = await sessionAtExit();
  await answerExit(sessionId, correct);
  const result = await completeSession(sessionId, DEMO_STUDENT_ID);
  if (!result.ok) throw new Error(`the session did not finish: ${result.error}`);
  return { sessionId, summary: result.summary };
}

describe("the seeded prototype rows", () => {
  it("give the demo student four rewards, the streak at 3 of 4", async () => {
    const rows = await rewardRows(DEMO_STUDENT_ID);
    expect(rows.map((row) => row.key).sort()).toEqual([
      "course-on-time",
      "intensive-pace",
      "streak-4-weeks",
      "unit-on-time",
    ]);
    for (const row of rows) {
      expect(row.current).toBeGreaterThanOrEqual(0);
      expect(row.current).toBeLessThan(row.target);
    }
    expect(rows.find((row) => row.key === "streak-4-weeks")).toEqual({
      key: "streak-4-weeks",
      current: 3,
      target: 4,
      unlocked: false,
    });
    expect(rows.some((row) => row.unlocked)).toBe(false);
  });

  it("give the demo student a mentor with a weekly check-in", async () => {
    expect(await mentorFor(DEMO_STUDENT_ID)).toMatchObject({
      name: "Jordan",
      school: "NYU",
      classYear: 2028,
      checkInDay: "thu",
      checkInTime: "19:00",
    });
    expect(await mentorFor("no-such-student")).toBeUndefined();
  });
});

describe("unlocking a reward", () => {
  it("unlocks nothing when the day is not on the schedule", async () => {
    const { summary } = await finishOne();
    expect(summary.rewards.streak.sessionDay).toBe(false);
    expect(summary.rewards.unlocks).toEqual([]);
    expect(await unlockRows()).toEqual([]);
  });

  it("unlocks the 4-week streak when a scheduled session finishes on its day", async () => {
    await scheduleToday();
    const { sessionId, summary } = await finishOne([true, false, false]);
    // A repeat still counts: the streak is about doing the work on schedule, not the score.
    expect(summary.outcome).toBe("repeat");
    expect(summary.rewards.unlocks.map((reward) => reward.key)).toEqual(["streak-4-weeks"]);
    expect(await unlockRows()).toEqual([{ key: "streak-4-weeks", sessionLogId: sessionId }]);

    // The reloaded end screen reads the unlock back from the session.
    const session = await getSession(sessionId, DEMO_STUDENT_ID);
    if (!session?.completedAt) throw new Error("the session has no completion time");
    expect(await sessionRewards(session, session.completedAt)).toEqual(summary.rewards);
  });

  it("stores it once: a replay and a later session the same day unlock nothing new", async () => {
    const [first] = await unlockRows();
    expect(await completeSession(first.sessionLogId, DEMO_STUDENT_ID)).toEqual({
      ok: false,
      error: "closed",
    });
    const { summary } = await finishOne();
    expect(summary.rewards.unlocks).toEqual([]);
    expect(await unlockRows()).toHaveLength(1);
  });

  it("survives a re-seed: the rows are restored and the unlock stays", async () => {
    await seedDemo(new Date("2026-10-01T12:00:00Z"));
    const unlocked = (await rewardRows(DEMO_STUDENT_ID)).filter((row) => row.unlocked);
    expect(unlocked.map((row) => row.key)).toEqual(["streak-4-weeks"]);
  });
});

describe("with the prototype rows missing", () => {
  it("finishes a session as before, with nothing unlocked", async () => {
    await removePrototypeRows();
    expect(await rewardRows(DEMO_STUDENT_ID)).toEqual([]);
    expect(await mentorFor(DEMO_STUDENT_ID)).toBeUndefined();
    const { summary } = await finishOne();
    expect(summary.outcome).toBe("mastered");
    expect(summary.rewards.unlocks).toEqual([]);
    expect(await unlockRows()).toEqual([]);
  });
});
