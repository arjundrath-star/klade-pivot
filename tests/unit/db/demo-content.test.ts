import { describe, expect, it } from "vitest";
import { S1_DEMO_KEY, S1_KEY } from "@/content/keys";
import { DEMO_SESSION_SEED, DEMO_STUDENT_ID, sessionContentKeyFor } from "@/db/demo";
import { openTodaySession } from "@/db/queries/sessions";
import { enrollStudent } from "@/onboarding/enroll";
import { loadSession } from "@/session/load";
import { withTempDatabase } from "../../helpers/database";

const NOW = new Date("2026-10-01T12:00:00Z");

// Which Session 1 a student runs, against a real libSQL file.
withTempDatabase("klade-demo-content-", NOW);

async function openedCounts(studentId: string) {
  const sessionId = await openTodaySession(studentId, DEMO_SESSION_SEED);
  if (sessionId === null) throw new Error("no session opened");
  const loaded = await loadSession(sessionId, studentId);
  return { contentKey: loaded?.session.contentKey, counts: loaded?.counts };
}

describe("the demo student's Session 1", () => {
  it("is the shortened variant for the demo student only", () => {
    expect(sessionContentKeyFor(DEMO_STUDENT_ID, S1_KEY)).toBe(S1_DEMO_KEY);
    expect(sessionContentKeyFor("another-student", S1_KEY)).toBe(S1_KEY);
    expect(sessionContentKeyFor(DEMO_STUDENT_ID, "algebra1/linear-equations/s2")).toBe(
      "algebra1/linear-equations/s2",
    );
  });

  it("runs 2, 2 and 3 problems for Maya, on Session 1's own template", async () => {
    expect(await openedCounts(DEMO_STUDENT_ID)).toEqual({
      contentKey: S1_KEY,
      counts: { warmup: 2, guided: 2, exit: 3 },
    });
  });

  it("runs the full session for a student who onboarded", async () => {
    const enrolled = await enrollStudent(
      {
        parentName: "Sam",
        studentName: "Ava",
        grade: 7,
        pronoun: "they",
        targetDate: "2027-05-31",
        pace: "on-track",
        sessionDays: ["mon", "tue", "thu", "sun"],
        sessionTime: "16:30",
        timerMode: "standard",
        interests: ["sports", "music"],
        favorites: {},
        lockRule: null,
      },
      NOW,
    );
    if (!enrolled.ok) throw new Error(enrolled.error);
    expect(await openedCounts(enrolled.studentId)).toEqual({
      contentKey: S1_KEY,
      counts: { warmup: 3, guided: 5, exit: 3 },
    });
  });
});
