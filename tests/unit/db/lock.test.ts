import { describe, expect, it } from "vitest";
import { resetDemo, simulateSessionDay } from "@/app/admin/actions";
import { GET } from "@/app/api/lock-state/route";
import { saveRule, switchRule, unlockTonight } from "@/app/parent/settings/actions";
import { DEMO_FAMILY_ID, DEMO_STUDENT_ID } from "@/db/demo";
import {
  lockSettings,
  saveLockRule,
  resetDemoClock,
  setLockEnabled,
  setLockOverride,
} from "@/db/queries/lock";
import { XP_TABLE } from "@/engine/progress";
import { phoneClock } from "@/parent/progress";
import { completeSession } from "@/session/complete";
import { lockView } from "@/session/lock-status";
import { sessionAtExit } from "../../helpers/answers";
import { answerExit, redirectOf, withTempDatabase } from "../../helpers/database";

// The phone lock against a real libSQL file, on the real clock: the demo clock is what makes the
// lock independent of the day the test runs.
withTempDatabase("klade-lock-", new Date());

function ruleForm(fields: Record<string, string | string[]>): FormData {
  const form = new FormData();
  for (const [name, value] of Object.entries(fields)) {
    for (const item of [value].flat()) form.append(name, item);
  }
  return form;
}

const MAYA_RULE = {
  days: ["mon", "tue", "thu", "sun"],
  startTime: "17:00",
  categories: ["games", "social"],
};

/** Runs a settings action and checks the notice it redirects back with. */
async function expectNotice(action: () => Promise<void>, notice: string): Promise<void> {
  expect(await redirectOf(action)).toBe(`/parent/settings?notice=${notice}`);
}

const get = (query: string) => GET(new Request(`http://localhost/api/lock-state${query}`));

describe("GET /api/lock-state", () => {
  it("says unlocked, with no rule, until the parent sets one", async () => {
    const response = await get("?view=parent");
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toMatchObject({ locked: false, reason: "no-rule", reward: null });
  });

  it.each([
    "",
    "?view=admin",
    "?view=parent&student=demo-student-maya",
    "?view=parent&view=x",
    "?view=parent&reward=yes",
  ])("refuses the malformed query %j", async (query) => {
    const response = await get(query);
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "invalid" });
  });

  it("acts as the current student on the student's view", async () => {
    const response = await get("?view=student");
    expect(await response.json()).toMatchObject({ reason: "no-rule" });
  });
});

describe("the parent's rule", () => {
  it("refuses a form with no day, no app category or a broken time", async () => {
    for (const form of [
      { ...MAYA_RULE, days: [] },
      { ...MAYA_RULE, categories: ["chat-app"] },
      { ...MAYA_RULE, startTime: "25:00" },
    ]) {
      await expectNotice(() => saveRule(ruleForm(form)), "invalid");
    }
    expect((await lockSettings(DEMO_FAMILY_ID, DEMO_STUDENT_ID))?.rule).toBeNull();
  });

  it("has nothing to switch or unlock before it is saved", async () => {
    await expectNotice(() => switchRule(ruleForm({ enabled: "on" })), "no-rule");
    await expectNotice(unlockTonight, "no-rule");
  });

  it("is created switched on, then edited and switched off and on", async () => {
    await expectNotice(() => saveRule(ruleForm(MAYA_RULE)), "saved");
    expect((await lockSettings(DEMO_FAMILY_ID, DEMO_STUDENT_ID))?.rule).toEqual({
      enabled: true,
      days: ["mon", "tue", "thu", "sun"],
      startTime: "17:00",
      categories: ["social", "games"],
      weekendOff: false,
      overrideUntil: null,
    });

    const edited = { ...MAYA_RULE, categories: ["video", "games", "social"], weekendOff: "on" };
    await expectNotice(() => saveRule(ruleForm(edited)), "saved");
    await expectNotice(() => switchRule(ruleForm({ enabled: "off" })), "off");
    expect((await lockSettings(DEMO_FAMILY_ID, DEMO_STUDENT_ID))?.rule).toMatchObject({
      enabled: false,
      categories: ["social", "games", "video"],
      weekendOff: true,
    });
    await expectNotice(() => switchRule(ruleForm({ enabled: "maybe" })), "invalid");
    await expectNotice(() => switchRule(ruleForm({ enabled: "on" })), "on");
    await expectNotice(() => saveRule(ruleForm(MAYA_RULE)), "saved");
  });

  it("is written only for a student in the family", async () => {
    expect(
      await saveLockRule("another-family", DEMO_STUDENT_ID, {
        ...MAYA_RULE,
        days: ["mon"],
        categories: ["games"],
        weekendOff: false,
      }),
    ).toBe(false);
    expect(await setLockEnabled("another-family", DEMO_STUDENT_ID, false)).toBe(false);
    expect(await setLockOverride("another-family", DEMO_STUDENT_ID, new Date())).toBe(false);
    expect(await resetDemoClock("another-family", new Date())).toBe(false);
    expect((await lockSettings(DEMO_FAMILY_ID, DEMO_STUDENT_ID))?.rule?.enabled).toBe(true);
  });
});

describe("the phone", () => {
  it("locks at the demo clock: a session day, five minutes after the rule starts", async () => {
    expect(await redirectOf(simulateSessionDay)).toBe("/admin?notice=clock");
    expect(await lockView(DEMO_STUDENT_ID)).toMatchObject({
      locked: true,
      reason: "session-due",
      rule: { enabled: true, categories: ["social", "games"], startTime: "17:00" },
      time: "5:05",
      reward: null,
    });
  });

  it("stays unlocked for tonight after the parent's unlock, through rule edits", async () => {
    await expectNotice(unlockTonight, "unlocked");
    expect(await lockView(DEMO_STUDENT_ID)).toMatchObject({ locked: false, reason: "override" });
    await expectNotice(() => saveRule(ruleForm({ ...MAYA_RULE, startTime: "16:00" })), "saved");
    expect(await lockView(DEMO_STUDENT_ID)).toMatchObject({ locked: false, reason: "override" });
  });

  it("starts locked again when the demo clock is set again", async () => {
    await expectNotice(() => saveRule(ruleForm(MAYA_RULE)), "saved");
    expect(await redirectOf(simulateSessionDay)).toBe("/admin?notice=clock");
    expect((await lockView(DEMO_STUDENT_ID)).locked).toBe(true);
  });

  it("unlocks when the rule is switched off, and locks when it is back on", async () => {
    await expectNotice(() => switchRule(ruleForm({ enabled: "off" })), "off");
    expect(await lockView(DEMO_STUDENT_ID)).toMatchObject({ locked: false, reason: "off" });
    await expectNotice(() => switchRule(ruleForm({ enabled: "on" })), "on");
    expect((await lockView(DEMO_STUDENT_ID)).locked).toBe(true);
  });

  it("unlocks the moment today's session is done, with what it earned", async () => {
    const sessionId = await sessionAtExit();
    await answerExit(sessionId, [true, true, true]);
    expect((await lockView(DEMO_STUDENT_ID)).locked).toBe(true);
    expect(await completeSession(sessionId, DEMO_STUDENT_ID)).toMatchObject({ ok: true });
    // Maya's seed has no schedule rows, so the session counts for no streak.
    expect(await lockView(DEMO_STUDENT_ID, new Date(), { reward: true })).toMatchObject({
      locked: false,
      reason: "session-done",
      reward: { xp: XP_TABLE.exit, streak: 0 },
    });
    // Only the poll that asks gets the reward worked out.
    expect((await lockView(DEMO_STUDENT_ID)).reward).toBeNull();
    const response = await get("?view=parent&reward=1");
    expect(await response.json()).toMatchObject({
      reason: "session-done",
      reward: { xp: XP_TABLE.exit, streak: 0 },
    });
  });

  it("says so when the demo clock cannot lock because today's session is done", async () => {
    expect(await redirectOf(simulateSessionDay)).toBe("/admin?notice=clock-done");
    expect((await lockView(DEMO_STUDENT_ID)).reason).toBe("session-done");
  });

  it("follows the real clock again after a reset", async () => {
    expect(await redirectOf(resetDemo)).toBe("/admin?notice=reset");
    const now = new Date();
    const view = await lockView(DEMO_STUDENT_ID, now);
    expect(view.time).toBe(phoneClock(now).time);
    expect(view.locked).toBe(false);
  });
});
