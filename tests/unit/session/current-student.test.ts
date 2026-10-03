import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { describe, expect, it } from "vitest";
import { adminControls } from "@/admin/controls";
import { switchRule } from "@/app/parent/settings/actions";
import { restartDemo, startTodaySession } from "@/app/student/actions";
import {
  DEMO_FAMILY_ID,
  DEMO_SESSION_SEED,
  DEMO_STUDENT_ID,
  resetDemoData,
  S1_TEMPLATE_ID,
} from "@/db/demo";
import { lockSettings } from "@/db/queries/lock";
import { findTodaySession, getSession } from "@/db/queries/sessions";
import { getStudent } from "@/db/queries/students";
import { createFamily } from "@/db/queries/students";
import { createVisitor } from "@/db/visitors";
import { freshGateToken, GATE_COOKIE } from "@/gate/token";
import {
  currentStudentId,
  parentOnPage,
  parentViewer,
  studentOnPage,
} from "@/session/current-student";
import { sessionAtExit } from "../../helpers/answers";
import { actAs, formOf, redirectOf, signIn, withTempDatabase } from "../../helpers/database";
import { TEST_ADMIN_PASSWORD } from "../../setup";

const NOW = new Date("2026-10-02T16:00:00Z");

withTempDatabase("klade-current-student-", NOW);

/** A browser that is nobody: neither cookie. */
async function signOut(): Promise<void> {
  (await cookies()).delete(GATE_COOKIE);
}

/** Signs the browser in at the gate and keeps whatever student cookie it has. */
async function signInKeepingCookie(): Promise<void> {
  (await cookies()).set(GATE_COOKIE, freshGateToken(TEST_ADMIN_PASSWORD));
}

/** A browser that onboarded a family: no gate cookie, the new student's cookie. */
async function asOnboarded(): Promise<string> {
  const studentId = randomUUID();
  await createFamily(
    "Sam",
    {
      id: studentId,
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
  await actAs(studentId);
  return studentId;
}

/** A visitor's browser: no gate cookie, a student cookie whose copy exists. */
async function asVisitor(): Promise<string> {
  const studentId = randomUUID();
  await createVisitor(studentId, NOW);
  await actAs(studentId);
  return studentId;
}

describe("who a browser is", () => {
  it("is the demo student when signed in at the gate with no student cookie", async () => {
    expect(await currentStudentId()).toBe(DEMO_STUDENT_ID);
    expect(await studentOnPage("/student")).toMatchObject({
      id: DEMO_STUDENT_ID,
      student: { id: DEMO_STUDENT_ID },
    });
    expect(await parentViewer()).toEqual({
      familyId: DEMO_FAMILY_ID,
      studentId: DEMO_STUDENT_ID,
      signedIn: true,
    });
  });

  it("is the cookie's student for a visitor, with the copy's family on the parent pages", async () => {
    const studentId = await asVisitor();
    const { familyId } = (await getStudent(studentId)) ?? {};
    expect(await currentStudentId()).toBe(studentId);
    expect(await studentOnPage("/student")).toMatchObject({
      id: studentId,
      student: { id: studentId, visitor: true },
    });
    expect(await parentOnPage("/parent")).toEqual({ familyId, studentId, signedIn: false });
    // Nothing of the admin's reaches a visitor: no ribbon, no clock button, no skip.
    expect(await adminControls()).toBeNull();
  });

  it("is the founder's again once signed in, whatever visitor's cookie it picked up before", async () => {
    await asVisitor();
    await signInKeepingCookie();
    expect(await currentStudentId()).toBe(DEMO_STUDENT_ID);
    expect(await studentOnPage("/student")).toMatchObject({ id: DEMO_STUDENT_ID });
    expect((await parentViewer())?.familyId).toBe(DEMO_FAMILY_ID);
    expect(await adminControls()).toMatchObject({ studentId: DEMO_STUDENT_ID });
  });

  it("is its own student for a browser that onboarded, with the gate still in front of the parent pages", async () => {
    const studentId = await asOnboarded();
    expect(await currentStudentId()).toBe(studentId);
    expect(await studentOnPage("/student")).toMatchObject({ id: studentId });
    expect(await parentViewer()).toBeNull();
    expect(await redirectOf(() => parentOnPage("/parent/settings"))).toBe(
      "/gate?next=%2Fparent%2Fsettings",
    );
    expect(await redirectOf(() => switchRule(formOf({ enabled: "off" })))).toBe(
      "/gate?next=%2Fparent%2Fsettings",
    );
  });

  it("is nobody with neither cookie: pages go to /demo, actions and routes act for no one", async () => {
    await signOut();
    expect(await currentStudentId()).toBeUndefined();
    expect(await parentViewer()).toBeNull();
    expect(await redirectOf(() => studentOnPage("/student/course"))).toBe(
      "/demo?next=%2Fstudent%2Fcourse",
    );
    expect(await redirectOf(() => parentOnPage("/parent/alerts"))).toBe(
      "/demo?next=%2Fparent%2Falerts",
    );
    expect(await redirectOf(startTodaySession)).toBe("/student");
    expect(await findTodaySession(DEMO_STUDENT_ID)).toMatchObject({ kind: "next" });
  });

  it("goes to /demo for a new copy when the cookie's student is gone; signed in, it is the founder's", async () => {
    await actAs(randomUUID());
    expect(await currentStudentId()).toBeDefined();
    expect(await redirectOf(() => studentOnPage("/student"))).toBe("/demo?next=%2Fstudent");
    expect(await redirectOf(() => parentOnPage("/parent"))).toBe("/demo?next=%2Fparent");
    await signInKeepingCookie();
    expect(await currentStudentId()).toBe(DEMO_STUDENT_ID);
    expect(await studentOnPage("/student")).toMatchObject({
      id: DEMO_STUDENT_ID,
      student: { id: DEMO_STUDENT_ID },
    });
  });
});

describe("a visitor's actions", () => {
  it("start the demo's session, from the fixed seed", async () => {
    const studentId = await asVisitor();
    const path = await redirectOf(startTodaySession);
    const sessionId = path.split("/").pop() ?? "";
    expect(path).toBe(`/student/session/${sessionId}`);
    expect((await getSession(sessionId, studentId))?.seed).toBe(DEMO_SESSION_SEED);
    expect(await findTodaySession(DEMO_STUDENT_ID)).toMatchObject({ kind: "next" });
  });

  it("change the copy's phone rule and no other", async () => {
    await resetDemoData(NOW);
    const studentId = await asVisitor();
    const { familyId } = (await getStudent(studentId)) ?? {};
    if (!familyId) throw new Error("no copy");
    expect(await redirectOf(() => switchRule(formOf({ enabled: "off" })))).toBe(
      "/parent/settings?notice=off",
    );
    expect((await lockSettings(familyId, studentId))?.rule?.enabled).toBe(false);
    expect((await lockSettings(DEMO_FAMILY_ID, DEMO_STUDENT_ID))?.rule?.enabled).toBe(true);
  });

  it("start the demo over for the copy, and for no one else", async () => {
    await resetDemoData(NOW);
    const studentId = await asVisitor();
    const sessionId = await sessionAtExit("pass", studentId);
    expect(await findTodaySession(studentId)).toMatchObject({ kind: "open", sessionId });
    expect(await redirectOf(restartDemo)).toBe("/student");
    expect(await findTodaySession(studentId)).toMatchObject({ kind: "next" });

    // The founder's browser presses nothing of the kind, and the action does nothing for Maya.
    await signIn();
    const mayaSession = await sessionAtExit("pass", DEMO_STUDENT_ID);
    expect(await redirectOf(restartDemo)).toBe("/student");
    expect(await findTodaySession(DEMO_STUDENT_ID)).toMatchObject({
      kind: "open",
      sessionId: mayaSession,
    });
  });
});
