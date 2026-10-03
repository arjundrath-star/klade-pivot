import { describe, expect, it } from "vitest";
import { NextPath } from "@/gate/next-path";
import { adminPath, gatedPath, gateUrl } from "@/gate/paths";

describe("gatedPath", () => {
  it.each(["/admin", "/admin/anything", "/parent", "/parent/settings", "/parent/alerts/x/preview"])(
    "gates %s",
    (path) => expect(gatedPath(path)).toBe(true),
  );

  it.each(["/", "/student", "/onboarding", "/gate", "/parents", "/administrator", "/api/parent"])(
    "leaves %s open",
    (path) => expect(gatedPath(path)).toBe(false),
  );
});

describe("adminPath", () => {
  it.each(["/admin", "/admin/anything"])("is only the founder's at %s", (path) =>
    expect(adminPath(path)).toBe(true),
  );

  it.each(["/parent", "/parent/alerts/x/preview", "/student", "/administrator", "/gate"])(
    "is not %s",
    (path) => expect(adminPath(path)).toBe(false),
  );
});

describe("NextPath", () => {
  it.each(["/admin", "/parent", "/parent/settings", "/admin?notice=reset"])("accepts %s", (path) =>
    expect(NextPath.safeParse(path).success).toBe(true),
  );

  it.each([
    "",
    "admin",
    "//evil.example",
    "/\\evil.example",
    "https://evil.example/admin",
    "/student",
    "/parents",
    "/admin x",
    `/admin?${"a".repeat(200)}`,
  ])("refuses %j", (path) => expect(NextPath.safeParse(path).success).toBe(false));
});

it("gateUrl sends the browser back where it was going", () => {
  expect(gateUrl("/parent/settings?notice=saved")).toBe(
    "/gate?next=%2Fparent%2Fsettings%3Fnotice%3Dsaved",
  );
});
