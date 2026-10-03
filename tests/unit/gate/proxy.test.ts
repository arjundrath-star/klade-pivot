import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { GATE_COOKIE, gateToken } from "@/gate/token";
import { proxy } from "@/proxy";
import { STUDENT_COOKIE } from "@/session/student-cookie";
import { TEST_ADMIN_PASSWORD } from "../../setup";

const VISITOR = "0b2f4a1e-7c3d-4e5f-8a9b-0c1d2e3f4a5b";

function request(path: string, cookies: Record<string, string> = {}): NextRequest {
  const cookie = Object.entries(cookies)
    .map(([name, value]) => `${name}=${value}`)
    .join("; ");
  return new NextRequest(`http://localhost:3000${path}`, { headers: cookie ? { cookie } : {} });
}

const signedIn = () => ({ [GATE_COOKIE]: gateToken(TEST_ADMIN_PASSWORD, Date.now() + 60_000) });

describe("the proxy at the admin panel", () => {
  it("sends a browser without the gate cookie to the gate, to come back to the page and its query", () => {
    const response = proxy(request("/admin?notice=reset", { [STUDENT_COOKIE]: VISITOR }));
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/gate?next=%2Fadmin%3Fnotice%3Dreset",
    );
    expect(response.cookies.get(STUDENT_COOKIE)).toBeUndefined();
  });

  it("lets a signed-in browser through", () => {
    const response = proxy(request("/admin", signedIn()));
    expect(response.status).toBe(200);
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });

  it("treats an expired or foreign cookie as none", () => {
    const expired = gateToken(TEST_ADMIN_PASSWORD, Date.now() - 1);
    expect(proxy(request("/admin", { [GATE_COOKIE]: expired })).status).toBe(303);
    const foreign = gateToken("another password", Date.now() + 60_000);
    expect(proxy(request("/admin", { [GATE_COOKIE]: foreign })).status).toBe(303);
  });
});

describe("the proxy at the student's and the parent's pages", () => {
  it.each(["/student", "/student/session/abc", "/parent", "/parent/settings?notice=saved"])(
    "gives a browser that is nobody a student cookie and sends it to /demo, to come back to %s",
    (path) => {
      const response = proxy(request(path));
      expect(response.status).toBe(303);
      expect(response.headers.get("location")).toBe(
        `http://localhost:3000/demo?next=${encodeURIComponent(path)}`,
      );
      const cookie = response.cookies.get(STUDENT_COOKIE);
      expect(cookie?.value).toMatch(/^[0-9a-f-]{36}$/);
      expect(cookie).toMatchObject({ httpOnly: true, sameSite: "lax", path: "/" });
      expect(cookie?.maxAge).toBeGreaterThan(0);
    },
  );

  it("mints a different id for every such browser", () => {
    const ids = new Set(
      Array.from(
        { length: 3 },
        () => proxy(request("/student")).cookies.get(STUDENT_COOKIE)?.value,
      ),
    );
    expect(ids.size).toBe(3);
  });

  it("lets a browser with a student cookie through, with no gate", () => {
    for (const path of ["/student", "/parent", "/parent/alerts/x/preview"]) {
      const response = proxy(request(path, { [STUDENT_COOKIE]: VISITOR }));
      expect(response.status).toBe(200);
      expect(response.headers.get("x-middleware-next")).toBe("1");
    }
  });

  it("treats a student cookie that is not a UUID as none", () => {
    const response = proxy(request("/student", { [STUDENT_COOKIE]: "demo-student-maya" }));
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toContain("/demo?next=");
  });

  it("lets a signed-in browser through without a student cookie", () => {
    expect(proxy(request("/student", signedIn())).status).toBe(200);
    expect(proxy(request("/parent", signedIn())).status).toBe(200);
  });
});
