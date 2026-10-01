import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/gate/enter/route";
import { MAX_FAILURES } from "@/gate/attempts";
import { GATE_COOKIE, gateOpen } from "@/gate/token";
import { TEST_ADMIN_PASSWORD } from "../../setup";

afterEach(() => vi.unstubAllEnvs());

/** Posts the gate form from `address`. */
function enter(fields: Record<string, string>, address = "198.51.100.1"): Promise<Response> {
  const body = new URLSearchParams(fields);
  return POST(
    new Request("http://localhost:3000/gate/enter", {
      method: "POST",
      body,
      headers: { "content-type": "application/x-www-form-urlencoded", "cf-connecting-ip": address },
    }),
  );
}

/** The redirect's target, which the gate always gives as a path on this site. */
function location(response: Response): string {
  const target = response.headers.get("location");
  if (!target) throw new Error("no redirect");
  expect(target.startsWith("/")).toBe(true);
  return target;
}

/** The gate cookie's value and attributes from the response. */
function gateCookie(response: Response) {
  const header = response.headers.getSetCookie().find((c) => c.startsWith(`${GATE_COOKIE}=`));
  if (!header) return undefined;
  const [pair, ...attributes] = header.split(";").map((part) => part.trim());
  return {
    value: pair.slice(GATE_COOKIE.length + 1),
    attributes: attributes.map((a) => a.toLowerCase()),
  };
}

describe("POST /gate/enter", () => {
  it("sets the gate cookie and sends the browser on for the right password", async () => {
    const response = await enter({ password: TEST_ADMIN_PASSWORD, next: "/parent/settings" });
    expect(response.status).toBe(303);
    expect(location(response)).toBe("/parent/settings");
    const cookie = gateCookie(response);
    expect(cookie).toBeDefined();
    expect(cookie?.attributes).toEqual(
      expect.arrayContaining(["httponly", "path=/", "samesite=lax", "max-age=86400"]),
    );
    expect(gateOpen(cookie?.value, TEST_ADMIN_PASSWORD)).toBe(true);
  });

  it("goes back to the form, with no cookie, for a wrong password", async () => {
    const response = await enter({ password: "nope", next: "/admin" });
    expect(response.status).toBe(303);
    expect(location(response)).toBe("/gate?next=%2Fadmin&notice=wrong");
    expect(gateCookie(response)).toBeUndefined();
  });

  it("refuses a destination that is not behind the gate, or off the site", async () => {
    for (const next of ["/student", "//evil.example/admin", "https://evil.example"]) {
      const response = await enter({ password: TEST_ADMIN_PASSWORD, next });
      expect(location(response)).toBe("/gate?next=%2Fadmin&notice=invalid");
      expect(gateCookie(response)).toBeUndefined();
    }
  });

  it("refuses a form with extra or missing fields, keeping a sound destination", async () => {
    expect(location(await enter({ next: "/parent/settings" }))).toBe(
      "/gate?next=%2Fparent%2Fsettings&notice=invalid",
    );
    expect(location(await enter({ password: "x", next: "/admin", user: "root" }))).toBe(
      "/gate?next=%2Fadmin&notice=invalid",
    );
  });

  it("says so when the server has no password, and sets nothing", async () => {
    vi.stubEnv("ADMIN_PASSWORD", "");
    const response = await enter({ password: "anything", next: "/admin" });
    expect(location(response)).toBe("/gate?next=%2Fadmin&notice=unset");
    expect(gateCookie(response)).toBeUndefined();
  });

  it("makes an address wait after too many wrong tries, even with the right password", async () => {
    const address = "203.0.113.77";
    for (let i = 0; i < MAX_FAILURES; i++) {
      expect(location(await enter({ password: `wrong ${i}`, next: "/admin" }, address))).toContain(
        "notice=wrong",
      );
    }
    const blocked = await enter({ password: TEST_ADMIN_PASSWORD, next: "/admin" }, address);
    expect(location(blocked)).toBe("/gate?next=%2Fadmin&notice=wait");
    expect(gateCookie(blocked)).toBeUndefined();
    // Another address is not affected.
    const other = await enter({ password: TEST_ADMIN_PASSWORD, next: "/admin" }, "203.0.113.78");
    expect(location(other)).toBe("/admin");
  });
});
