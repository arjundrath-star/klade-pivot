import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { overrideExplanation, switchInterest } from "@/app/admin/actions";
import { getDb } from "@/db/client";
import { DEMO_FAMILY_ID, DEMO_STUDENT_ID, S1_TEMPLATE_ID } from "@/db/demo";
import { familyAlert, familyAlerts } from "@/db/queries/alerts";
import { latestExplanation, masteryGrid, sessionHistory } from "@/db/queries/parent";
import { getSession } from "@/db/queries/sessions";
import { usageBySession } from "@/db/queries/usage";
import { aiUsage, explainBacks, sessionLogs } from "@/db/schema";
import { COACH_MODEL } from "@/coach/prompt";
import { proposedDays, weekdayOf } from "@/engine/pace";
import { calendarDay } from "@/parent/progress";
import { markTodayMissed } from "@/session/alerts";
import { studentPace } from "@/session/pace";
import { completeSession } from "@/session/complete";
import { loadSession } from "@/session/load";
import { overrideExplainBack, overrideTarget } from "@/session/override";
import { recordPass, sessionAt, sessionAtExit } from "../../helpers/answers";
import { answerExit, redirectOf, withTempDatabase } from "../../helpers/database";

// The parent view's data, the missed-session alert and the admin controls against a real libSQL file.
withTempDatabase("klade-parent-", new Date("2026-10-01T12:00:00Z"));

const DAY_MS = 24 * 60 * 60 * 1000;

// The seed puts Maya on the On track days.
const MAYA_DAYS = proposedDays(4);

describe("the missed-session alert", () => {
  const now = new Date();

  it("starts on track", async () => {
    expect(await studentPace(DEMO_STUDENT_ID, now)).toBe(0);
  });

  it("keeps a day with a session open on it from being marked missed", async () => {
    const open = await sessionAt("warmup");
    expect(await markTodayMissed(DEMO_STUDENT_ID, now)).toEqual({
      ok: false,
      error: "open-today",
    });
    await (await getDb()).delete(sessionLogs).where(eq(sessionLogs.id, open));
  });

  it("marks today missed, raises the alert in the pitch wording and puts Maya 1 behind", async () => {
    expect(await markTodayMissed(DEMO_STUDENT_ID, now)).toEqual({ ok: true, behind: 1 });
    expect(await studentPace(DEMO_STUDENT_ID, now)).toBe(1);

    const alerts = await familyAlerts(DEMO_FAMILY_ID);
    expect(alerts).toHaveLength(1);
    expect(alerts[0]).toMatchObject({
      message: "Maya missed today's Algebra session. She's 1 session behind her May target.",
    });
    expect(await familyAlert(alerts[0].id, DEMO_FAMILY_ID)).toMatchObject({ studentName: "Maya" });
    expect(await familyAlert(alerts[0].id, "another-family")).toBeUndefined();

    const history = await sessionHistory(DEMO_STUDENT_ID);
    expect(history).toEqual([
      expect.objectContaining({ status: "missed", scheduledFor: calendarDay(now) }),
    ]);
  });

  it("raises no second alert for the same day", async () => {
    expect(await markTodayMissed(DEMO_STUDENT_ID, now)).toEqual({
      ok: false,
      error: "already-missed",
    });
    expect(await familyAlerts(DEMO_FAMILY_ID)).toHaveLength(1);
  });

  it("counts an earlier schedule day that was never made up, and Maya's days since", async () => {
    const db = await getDb();
    await db.insert(sessionLogs).values({
      studentId: DEMO_STUDENT_ID,
      sessionTemplateId: S1_TEMPLATE_ID,
      status: "scheduled",
      seed: 1,
      scheduledFor: calendarDay(new Date(now.getTime() - 2 * DAY_MS)),
    });
    // Today, missed; the row two days back; yesterday too when it is one of Maya's session days.
    const yesterday = calendarDay(new Date(now.getTime() - DAY_MS));
    const yesterdayDue = MAYA_DAYS.includes(weekdayOf(yesterday)) ? 1 : 0;
    expect(await studentPace(DEMO_STUDENT_ID, now)).toBe(2 + yesterdayDue);
  });
});

describe("the explain-back override", () => {
  let sessionId: string;

  it("is unavailable until a session waits on explain-back", async () => {
    sessionId = await sessionAt("guided");
    expect(await overrideTarget(DEMO_STUDENT_ID)).toEqual({ ok: false, error: "wrong-block" });
    sessionId = await sessionAt("explain");
    expect((await overrideTarget(DEMO_STUDENT_ID)).ok).toBe(true);
  });

  it("passes explain-back after a failed try, and the student sees no result card", async () => {
    await recordPass(sessionId, "x is 5");
    const db = await getDb();
    await db
      .update(explainBacks)
      .set({ verdict: "fail" })
      .where(eq(explainBacks.sessionLogId, sessionId));
    expect((await loadSession(sessionId, DEMO_STUDENT_ID))?.progress.explainBack).toBe("retry");

    expect(await redirectOf(overrideExplanation)).toBe("/admin?notice=override");
    const loaded = await loadSession(sessionId, DEMO_STUDENT_ID);
    expect(loaded?.progress.explainBack).toBe("passed");
    expect(loaded?.explain.attempts).toBe(2);
    expect(loaded?.explain.results).toEqual([]);
  });

  it("refuses a second override once explain-back is final", async () => {
    expect(await overrideExplainBack(DEMO_STUDENT_ID)).toEqual({ ok: false, error: "graded" });
  });
});

describe("a finished session on the parent view", () => {
  let sessionId: string;

  it("raises a mastery alert when the session ends in mastery", async () => {
    sessionId = await sessionAtExit();
    await answerExit(sessionId, [true, true, true]);
    const result = await completeSession(sessionId, DEMO_STUDENT_ID);
    expect(result).toMatchObject({ ok: true, summary: { outcome: "mastered" } });

    const [latest] = await familyAlerts(DEMO_FAMILY_ID);
    expect(latest).toMatchObject({
      message:
        "Maya mastered solving two-step linear equations, with 3 of 3 on the timed exit check.",
    });
  });

  it("shows the student's own explanation and the mastery at once", async () => {
    expect(await latestExplanation(DEMO_STUDENT_ID)).toMatchObject({
      concept: "Solving two-step linear equations",
      text: "Same thing to both sides keeps it balanced.",
      source: "typed",
      verdict: "pass",
    });
    // The grid lists every concept of the course; only two-step equations has a status.
    const grid = await masteryGrid(DEMO_STUDENT_ID);
    expect(grid).toHaveLength(49);
    expect(grid.filter((row) => row.status !== null)).toEqual([
      expect.objectContaining({
        title: "Solving two-step linear equations",
        status: "mastered",
        exitScore: 3,
      }),
    ]);
  });

  it("counts the finished sessions against the schedule", async () => {
    // Two schedule days owed; three sessions closed done since, the last one mastered.
    expect(await studentPace(DEMO_STUDENT_ID, new Date())).toBe(0);
  });

  it("refuses to mark a day missed once a session finished on it", async () => {
    expect(await markTodayMissed(DEMO_STUDENT_ID, new Date())).toEqual({
      ok: false,
      error: "done-today",
    });
  });
});

describe("AI cost per session", () => {
  it("sums the four token columns per session and model", async () => {
    const sessionId = await sessionAt("guided");
    const db = await getDb();
    const call = { kind: "coach" as const, model: COACH_MODEL, sessionLogId: sessionId };
    await db.insert(aiUsage).values([
      { ...call, inputTokens: 900, outputTokens: 150, cacheReadTokens: 0, cacheWriteTokens: 0 },
      { ...call, inputTokens: 100, outputTokens: 50, cacheReadTokens: 30, cacheWriteTokens: 20 },
    ]);
    const rows = await usageBySession(DEMO_STUDENT_ID);
    expect(rows.find((row) => row.sessionLogId === sessionId)).toMatchObject({
      model: COACH_MODEL,
      calls: 2,
      inputTokens: 1000,
      outputTokens: 200,
      cacheReadTokens: 30,
      cacheWriteTokens: 20,
    });
  });
});

describe("switching the interest", () => {
  it("frames the next rendered problem in the new interest", async () => {
    const form = new FormData();
    form.set("interest", "gaming");
    expect(await redirectOf(() => switchInterest(form))).toBe("/admin?notice=interest");
    const [open] = await (
      await getDb()
    )
      .select({ id: sessionLogs.id })
      .from(sessionLogs)
      .where(eq(sessionLogs.status, "in_progress"));
    expect((await getSession(open.id, DEMO_STUDENT_ID))?.interests).toEqual(["gaming"]);
  });

  it("rejects an interest that is not one of the six", async () => {
    const form = new FormData();
    form.set("interest", "chess");
    expect(await redirectOf(() => switchInterest(form))).toBe("/admin?notice=invalid");
  });
});
