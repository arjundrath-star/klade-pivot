import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { completeOnboarding } from "@/app/onboarding/actions";
import { getDb } from "@/db/client";
import { DEMO_STUDENT_ID, S1_TEMPLATE_ID } from "@/db/demo";
import { familyAlerts } from "@/db/queries/alerts";
import { findTodaySession, openTodaySession } from "@/db/queries/sessions";
import { getStudent } from "@/db/queries/students";
import { families, sessionLogs, students } from "@/db/schema";
import { addDays } from "@/engine/pace";
import { enrollStudent } from "@/onboarding/enroll";
import type { OnboardingInput } from "@/onboarding/schema";
import { calendarDay } from "@/parent/progress";
import { markTodayMissed } from "@/session/alerts";
import { currentStudentId } from "@/session/current-student";
import { loadSession } from "@/session/load";
import { studentPace } from "@/session/pace";
import { renderSessionProblem } from "@/session/problems";
import { withTempDatabase } from "../../helpers/database";

// Onboarding against a real libSQL file. Oct 1, 2026 is a Thursday; noon in New York.
const NOW = new Date("2026-10-01T16:00:00Z");
withTempDatabase("klade-onboarding-", NOW);

const AVA: OnboardingInput = {
  parentName: "Sam",
  studentName: "Ava",
  grade: 7,
  pronoun: "they",
  targetDate: "2027-05-31",
  pace: "on-track",
  sessionDays: ["mon", "tue", "thu", "sun"],
  sessionTime: "16:30",
  timerMode: "extended",
  interests: ["gaming", "animals"],
  favorites: { animals: "Dogs" },
};

async function enroll(input: OnboardingInput = AVA): Promise<string> {
  const result = await enrollStudent(input, NOW);
  if (!result.ok) throw new Error(`enrollment failed: ${result.error}`);
  return result.studentId;
}

const at = (iso: string) => new Date(`${iso}T16:00:00Z`);

/** Server actions that end in a redirect throw Next's redirect error; this reads its target. */
async function redirectOf(action: () => Promise<unknown>): Promise<string> {
  try {
    await action();
  } catch (error) {
    const digest = (error as { digest?: string }).digest ?? "";
    return digest.split(";")[2] ?? digest;
  }
  throw new Error("expected a redirect");
}

describe("enrollStudent", () => {
  let studentId: string;

  it("creates the family and the student with the plan they chose", async () => {
    studentId = await enroll();
    const db = await getDb();
    const [student] = await db.select().from(students).where(eq(students.id, studentId));
    expect(student).toMatchObject({
      name: "Ava",
      grade: 7,
      pronoun: "they",
      targetDate: "2027-05-31",
      pacePerWeek: 4,
      sessionDays: ["mon", "tue", "thu", "sun"],
      sessionTime: "16:30",
      timerMode: "extended",
      interests: ["gaming", "animals"],
      favorites: { animals: "Dogs" },
    });
    const [family] = await db.select().from(families).where(eq(families.id, student.familyId));
    expect(family.parentName).toBe("Sam");
  });

  it("schedules the first two weeks on the chosen weekdays, starting today", async () => {
    const db = await getDb();
    const rows = await db
      .select()
      .from(sessionLogs)
      .where(eq(sessionLogs.studentId, studentId))
      .orderBy(sessionLogs.scheduledFor);
    expect(rows.map((row) => row.scheduledFor)).toEqual([
      "2026-10-01",
      "2026-10-04",
      "2026-10-05",
      "2026-10-06",
      "2026-10-08",
      "2026-10-11",
      "2026-10-12",
      "2026-10-13",
    ]);
    for (const row of rows) {
      expect(row).toMatchObject({ status: "scheduled", sessionTemplateId: S1_TEMPLATE_ID });
      expect(Number.isInteger(row.seed)).toBe(true);
    }
  });

  it("counts the schedule from its first day, and past the two weeks on the plan's weekdays", async () => {
    expect(await studentPace(studentId, NOW)).toBe(0);
    // Tue Oct 6: Thu, Sun and Mon are due.
    expect(await studentPace(studentId, at("2026-10-06"))).toBe(3);
    // Tue Oct 20: the eight stored days, then Thu 15, Sun 18 and Mon 19.
    expect(await studentPace(studentId, at("2026-10-20"))).toBe(11);
  });

  it("frames the first session's word problems in the student's interests", async () => {
    expect(await findTodaySession(studentId)).toMatchObject({ kind: "next", templateId: S1_TEMPLATE_ID });
    const sessionId = await openTodaySession(studentId, 1357);
    if (!sessionId) throw new Error("no session to open");
    const loaded = await loadSession(sessionId, studentId);
    if (!loaded) throw new Error("session not found");
    const words = loaded.problems
      .map((problem) => renderSessionProblem(problem, loaded.session.interests))
      .filter((problem) => problem.kind === "word");
    expect(words.length).toBeGreaterThan(0);
    for (const problem of words) {
      expect(["gaming", "animals"]).toContain(problem.kind === "word" && problem.variant);
    }
    const db = await getDb();
    await db.delete(sessionLogs).where(eq(sessionLogs.id, sessionId));
  });

  it("writes the missed-session alert with the pronoun the parent picked", async () => {
    expect(await markTodayMissed(studentId, NOW)).toEqual({ ok: true, behind: 1 });
    const student = await getStudent(studentId);
    if (!student) throw new Error("student not found");
    const [alert] = await familyAlerts(student.familyId);
    expect(alert.message).toBe(
      "Ava missed today's Algebra session. They're 1 session behind their May target.",
    );
  });

  it("starts the schedule tomorrow when today's start time has passed", async () => {
    // 9:30 PM in New York on Thursday Oct 1, with sessions at 5:00 PM.
    const late = new Date("2026-10-02T01:30:00Z");
    const result = await enrollStudent({ ...AVA, studentName: "Lee", sessionTime: "17:00" }, late);
    if (!result.ok) throw new Error(result.error);
    const rows = await (await getDb())
      .select({ day: sessionLogs.scheduledFor })
      .from(sessionLogs)
      .where(eq(sessionLogs.studentId, result.studentId))
      .orderBy(sessionLogs.scheduledFor);
    expect(rows[0].day).toBe("2026-10-04");
    expect(rows.at(-1)?.day).toBe("2026-10-15");
    expect(await studentPace(result.studentId, at("2026-10-02"))).toBe(0);
  });

  it("refuses a plan that cannot finish by the target and writes nothing", async () => {
    const db = await getDb();
    const before = (await db.select({ id: students.id }).from(students)).length;
    expect(
      await enrollStudent({ ...AVA, pace: "standard", sessionDays: ["mon", "wed", "fri"] }, NOW),
    ).toEqual({ ok: false, error: "misses-target" });
    expect(await enrollStudent({ ...AVA, targetDate: "2026-11-01" }, NOW)).toEqual({
      ok: false,
      error: "target-too-soon",
    });
    expect(await enrollStudent({ ...AVA, targetDate: "2029-06-01" }, NOW)).toEqual({
      ok: false,
      error: "target-too-far",
    });
    expect((await db.select({ id: students.id }).from(students)).length).toBe(before);
  });
});

describe("completeOnboarding", () => {
  it("refuses input the schema refuses and leaves the browser as the demo student", async () => {
    expect(await completeOnboarding({ ...AVA, email: "sam@example.com" } as OnboardingInput)).toEqual({
      ok: false,
      error: "invalid",
    });
    expect(await currentStudentId()).toBe(DEMO_STUDENT_ID);
  });

  it("enrolls the student, makes this browser act as them and goes to /student", async () => {
    // The action plans from the real today, so the target is a year out from it.
    const targetDate = addDays(calendarDay(new Date()), 365);
    const noor = { ...AVA, studentName: "Noor", targetDate };
    expect(await redirectOf(() => completeOnboarding(noor))).toBe("/student");
    const studentId = await currentStudentId();
    expect(studentId).not.toBe(DEMO_STUDENT_ID);
    expect(await getStudent(studentId)).toMatchObject({ name: "Noor" });
  });

  it("falls back to the demo student when the cookie holds no student id", async () => {
    const { cookies } = await import("next/headers");
    (await cookies()).set("klade_student", "demo-student-maya' or 1=1");
    expect(await currentStudentId()).toBe(DEMO_STUDENT_ID);
  });
});
