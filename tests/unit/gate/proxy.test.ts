import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { GATE_COOKIE, gateToken } from "@/gate/token";
import { proxy } from "@/proxy";
import { TEST_ADMIN_PASSWORD } from "../../setup";

function request(path: string, cookie?: string): NextRequest {
  return new NextRequest(`http://localhost:3000${path}`, {
    headers: cookie ? { cookie: `${GATE_COOKIE}=${cookie}` } : {},
  });
}

describe("the gate proxy", () => {
  it("sends a browser without the cookie to the gate, to come back to the page and its query", () => {
    const response = proxy(request("/parent/settings?notice=saved"));
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/gate?next=%2Fparent%2Fsettings%3Fnotice%3Dsaved",
    );
  });

  it("lets a signed-in browser through", () => {
    const response = proxy(request("/admin", gateToken(TEST_ADMIN_PASSWORD, Date.now() + 60_000)));
    expect(response.status).toBe(200);
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });

  it("treats an expired or foreign cookie as none", () => {
    const expired = gateToken(TEST_ADMIN_PASSWORD, Date.now() - 1);
    expect(proxy(request("/admin", expired)).status).toBe(303);
    const foreign = gateToken("another password", Date.now() + 60_000);
    expect(proxy(request("/admin", foreign)).status).toBe(303);
  });
});
