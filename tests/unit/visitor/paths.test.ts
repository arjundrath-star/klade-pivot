import { describe, expect, it } from "vitest";
import { DemoNext } from "@/visitor/next-path";
import { demoUrl, visitorPath } from "@/visitor/paths";

describe("visitorPath", () => {
  it.each(["/student", "/student/course", "/parent", "/parent/settings"])(
    "lands a new copy at %s",
    (path) => expect(visitorPath(path)).toBe(true),
  );

  it.each([
    "/",
    "/admin",
    "/onboarding",
    "/gate",
    "/students",
    "/parents",
    "/api/lock-state",
    // A session is one copy's own: a browser sent from one starts at the student's home.
    "/student/session/0b2f4a1e-7c3d-4e5f-8a9b-0c1d2e3f4a5b",
  ])("does not at %s", (path) => expect(visitorPath(path)).toBe(false));
});

describe("DemoNext", () => {
  it.each(["/student", "/parent/alerts", "/student/calendar?month=2026-11"])("accepts %s", (path) =>
    expect(DemoNext.parse(path)).toBe(path),
  );

  it.each([
    null,
    "",
    "student",
    "//evil.example",
    "https://evil.example/student",
    "/admin",
    "/students",
    "/student/session/0b2f4a1e-7c3d-4e5f-8a9b-0c1d2e3f4a5b",
    "/student x",
    `/student?${"a".repeat(200)}`,
  ])("falls back to the student's home for %j", (path) =>
    expect(DemoNext.parse(path)).toBe("/student"),
  );
});

it("demoUrl sends the browser back where it was going", () => {
  expect(demoUrl("/parent/settings?notice=saved")).toBe(
    "/demo?next=%2Fparent%2Fsettings%3Fnotice%3Dsaved",
  );
});
