import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { confirmLesson, moveBlock } from "@/app/student/session/[id]/actions";
import { getDb } from "@/db/client";
import { DEMO_STUDENT_ID } from "@/db/demo";
import { studentEarnings } from "@/db/queries/rewards";
import { getSession, openTodaySession } from "@/db/queries/sessions";
import { badges, xpEvents } from "@/db/schema";
import { completeSession } from "@/session/complete";
import { studentStanding } from "@/session/pace";
import { sessionRewards } from "@/session/rewards";
import { recordPass, scheduleToday, sessionAtExit } from "../../helpers/answers";
import { answerExit, solve, withTempDatabase } from "../../helpers/database";

// XP, the streak and badges against a real libSQL file.
withTempDatabase("klade-rewards-", new Date("2026-10-01T12:00:00Z"));

async function xpRows(sessionId: string) {
  const db = await getDb();
  return db
    .select({ kind: xpEvents.kind, amount: xpEvents.amount })
    .from(xpEvents)
    .where(eq(xpEvents.sessionLogId, sessionId))
    .orderBy(xpEvents.createdAt);
}

async function badgeKeys() {
  const db = await getDb();
  const rows = await db
    .select({ key: badges.key })
    .from(badges)
    .where(eq(badges.studentId, DEMO_STUDENT_ID));
  return rows.map((row) => row.key).sort();
}

describe("a full session", () => {
  let sessionId: string;

  it("pays the warm-up once, however often the student goes back and forth", async () => {
    await scheduleToday();
    sessionId = (await openTodaySession(DEMO_STUDENT_ID, 7)) ?? "";
    expect(await moveBlock({ sessionId, from: "warmup", direction: "next" })).toMatchObject({
      error: "incomplete",
    });
    await solve(sessionId, "warmup", [0, 1, 2]);
    // Two tabs press Next together: one moves, both try to pay, one award stands.
    const [first, second] = await Promise.all([
      moveBlock({ sessionId, from: "warmup", direction: "next" }),
      moveBlock({ sessionId, from: "warmup", direction: "next" }),
    ]);
    expect([first.ok, second.ok].sort()).toEqual([false, true]);
    expect(await moveBlock({ sessionId, from: "learn", direction: "back" })).toMatchObject({
      to: "warmup",
    });
    expect(await moveBlock({ sessionId, from: "warmup", direction: "next" })).toMatchObject({
      to: "learn",
    });
    expect(await xpRows(sessionId)).toEqual([{ kind: "warmup", amount: 10 }]);
  });

  it("pays nothing for the lesson, five per guided problem and the explain-back pass", async () => {
    await confirmLesson({ sessionId });
    await moveBlock({ sessionId, from: "learn", direction: "next" });
    await solve(sessionId, "guided", [0, 1, 2, 3, 4]);
    await moveBlock({ sessionId, from: "guided", direction: "next" });
    // A top mark on every criterion earns "Explained it perfectly".
    await recordPass(sessionId, "Same thing to both sides keeps it balanced.", {
      correctness: 3,
      justification: 3,
      precision: 3,
    });
    await moveBlock({ sessionId, from: "explain", direction: "next" });
    expect(await xpRows(sessionId)).toEqual([
      { kind: "warmup", amount: 10 },
      { kind: "guided", amount: 25 },
      { kind: "explain", amount: 25 },
    ]);
  });

  it("pays the exit check, starts the streak and awards the badges when the session ends", async () => {
    await answerExit(sessionId, [true, true, false]);
    const result = await moveBlock({ sessionId, from: "exit", direction: "next" });
    expect(result).toMatchObject({ ok: true, to: "done", summary: { outcome: "mastered" } });
    if (!result.ok || result.to !== "done") throw new Error("the session did not finish");
    const { rewards } = result.summary;
    expect(rewards.xp).toBe(110);
    expect(rewards.awards.map((award) => award.kind)).toEqual([
      "warmup",
      "guided",
      "explain",
      "exit",
    ]);
    expect(rewards.streak).toEqual({
      before: { count: 0, untilFreeze: 0 },
      after: { count: 1, untilFreeze: 0 },
      sessionDay: true,
      alreadyCounted: false,
    });
    expect(rewards.badges.map((badge) => badge.label)).toEqual([
      "Solving two-step linear equations mastered",
      "Explained it perfectly",
    ]);

    // The reloaded end screen reads the same rewards back.
    const session = await getSession(sessionId, DEMO_STUDENT_ID);
    if (!session?.completedAt) throw new Error("the session has no completion time");
    expect(await sessionRewards(session, session.completedAt)).toEqual(rewards);
  });

  it("pays nothing twice when the completion is replayed", async () => {
    expect(await moveBlock({ sessionId, from: "exit", direction: "next" })).toEqual({
      ok: false,
      error: "closed",
    });
    expect(await completeSession(sessionId, DEMO_STUDENT_ID)).toEqual({
      ok: false,
      error: "closed",
    });
    expect(await xpRows(sessionId)).toHaveLength(4);
    expect(await badgeKeys()).toEqual([
      "concept:algebra1/linear-equations/s1",
      "explained-perfectly",
    ]);
    const earnings = await studentEarnings(DEMO_STUDENT_ID);
    expect(earnings.xp).toBe(110);
    expect((await studentStanding(DEMO_STUDENT_ID, new Date())).streak.count).toBe(1);
  });
});

describe("a second session the same day", () => {
  it("pays its exit check without explain-back XP when the explain-back failed", async () => {
    const sessionId = await sessionAtExit("fail");
    await answerExit(sessionId, [true, true, true]);
    const result = await completeSession(sessionId, DEMO_STUDENT_ID);
    expect(result).toMatchObject({ ok: true, summary: { outcome: "repeat" } });
    if (!result.ok) throw new Error("the session did not finish");
    const { rewards } = result.summary;
    expect(rewards.awards).toEqual([{ kind: "exit", amount: 50 }]);
    // Today already counted, and the badges were earned by the first session.
    expect(rewards.streak).toMatchObject({ after: { count: 1 }, alreadyCounted: true });
    expect(rewards.badges).toEqual([]);
    expect((await studentEarnings(DEMO_STUDENT_ID)).xp).toBe(160);
  });

  it("pays no exit XP below the pass mark", async () => {
    const sessionId = await sessionAtExit();
    await answerExit(sessionId, [true, false, false]);
    const result = await completeSession(sessionId, DEMO_STUDENT_ID);
    expect(result).toMatchObject({ ok: true, summary: { rewards: { xp: 0, awards: [] } } });
  });
});
