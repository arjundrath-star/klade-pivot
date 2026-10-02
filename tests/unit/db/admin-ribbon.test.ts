import { describe, expect, it } from "vitest";
import { resetDemo, simulateMissedSession, switchInterest } from "@/app/admin/actions";
import { DEMO_STUDENT_ID } from "@/db/demo";
import { getStudent } from "@/db/queries/students";
import { formOf, redirectOf, withTempDatabase } from "../../helpers/database";

withTempDatabase("klade-admin-ribbon-", new Date("2026-10-02T16:00:00Z"));

describe("the admin ribbon's actions", () => {
  it("come back to the student screen the ribbon was on, with the notice", async () => {
    expect(
      await redirectOf(() => switchInterest(formOf({ interest: "gaming", back: "/student" }))),
    ).toBe("/student?notice=interest");
    expect((await getStudent(DEMO_STUDENT_ID))?.interests).toEqual(["gaming"]);
    const session = "/student/session/0b2f4a1e-7c3d-4e5f-8a9b-0c1d2e3f4a5b";
    expect(
      await redirectOf(() => switchInterest(formOf({ interest: "music", back: session }))),
    ).toBe(`${session}?notice=interest`);
  });

  it("go back to the admin panel without a back field, or with one that is not a student screen", async () => {
    expect(await redirectOf(() => switchInterest(formOf({ interest: "sports" })))).toBe(
      "/admin?notice=interest",
    );
    for (const back of [
      "https://example.com/student",
      "//example.com",
      "/parent",
      "/student/session/x",
    ]) {
      expect(await redirectOf(() => switchInterest(formOf({ interest: "sports", back })))).toBe(
        "/admin?notice=interest",
      );
    }
    expect(await redirectOf(simulateMissedSession)).toBe("/admin?notice=missed");
  });

  it("send Reset demo back to the student's home when the ribbon asks", async () => {
    expect(await redirectOf(() => resetDemo(formOf({ back: "/student" })))).toBe(
      "/student?notice=reset",
    );
  });
});
