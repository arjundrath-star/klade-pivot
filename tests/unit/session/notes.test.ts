import { describe, expect, it } from "vitest";
import { saveNotes } from "@/app/student/session/[id]/actions";
import { DEMO_STUDENT_ID } from "@/db/demo";
import { saveSessionNotes, sessionNotes } from "@/db/queries/notes";
import { openTodaySession } from "@/db/queries/sessions";
import { loadSession } from "@/session/load";
import { NOTES_MAX_LENGTH, normalizeNotes } from "@/session/notes";
import { sessionAt } from "../../helpers/answers";
import { withTempDatabase } from "../../helpers/database";

withTempDatabase("klade-notes-", new Date("2026-10-01T12:00:00Z"));

describe("the notes text", () => {
  it("keeps line breaks and tabs, drops other control characters, folds Windows line endings", () => {
    expect(normalizeNotes("3x + 5 = 20\r\n\tsubtract 5\u0000\u0007 first")).toBe(
      "3x + 5 = 20\n\tsubtract 5 first",
    );
  });
});

describe("saving notes", () => {
  it("stores the student's notes on their open session and reads them back", async () => {
    const sessionId = (await openTodaySession(DEMO_STUDENT_ID, 77)) ?? "";
    expect(await sessionNotes(sessionId, DEMO_STUDENT_ID)).toBe("");
    expect(await saveNotes({ sessionId, notes: "undo the +5 first\nthen divide" })).toEqual({
      ok: true,
    });
    expect(await sessionNotes(sessionId, DEMO_STUDENT_ID)).toBe("undo the +5 first\nthen divide");
    expect(await saveNotes({ sessionId, notes: "" })).toEqual({ ok: true });
    expect(await sessionNotes(sessionId, DEMO_STUDENT_ID)).toBe("");
    // The cap counts the characters kept: Windows line endings fold before it applies.
    const page = "a".repeat(NOTES_MAX_LENGTH - 1);
    expect(await saveNotes({ sessionId, notes: `${page}\r\n` })).toEqual({ ok: true });
    expect(await sessionNotes(sessionId, DEMO_STUDENT_ID)).toBe(`${page}\n`);
  });

  it("refuses malformed input and a session that is not the student's open one", async () => {
    const sessionId = await sessionAt("guided");
    expect(await saveNotes({ sessionId: "not-a-session", notes: "x" })).toEqual({
      ok: false,
      error: "invalid",
    });
    expect(await saveNotes({ sessionId, notes: "a".repeat(NOTES_MAX_LENGTH + 1) })).toEqual({
      ok: false,
      error: "invalid",
    });
    expect(await saveNotes({ sessionId: crypto.randomUUID(), notes: "x" })).toEqual({
      ok: false,
      error: "closed",
    });
    expect(await saveSessionNotes(sessionId, "someone-else", "x")).toBe(false);
    expect(await sessionNotes(sessionId, "someone-else")).toBe("");
  });

  it("keeps the notes out of the loaded session that the coach and the grader read", async () => {
    const sessionId = await sessionAt("guided");
    const note = "my private working on 7x";
    expect(await saveNotes({ sessionId, notes: note })).toEqual({ ok: true });
    const loaded = await loadSession(sessionId, DEMO_STUDENT_ID);
    expect(JSON.stringify(loaded)).not.toContain(note);
  });
});
