import { describe, expect, it } from "vitest";
import {
  blocked,
  clearFailures,
  clientAddress,
  MAX_FAILURES,
  recordFailure,
  WINDOW_MS,
} from "@/gate/attempts";

const T0 = Date.parse("2026-10-02T21:00:00Z");

describe("gate attempts", () => {
  it("blocks an address after the allowed failures inside the window", () => {
    for (let i = 0; i < MAX_FAILURES - 1; i++) recordFailure("a", T0 + i);
    expect(blocked("a", T0 + MAX_FAILURES)).toBe(false);
    recordFailure("a", T0 + MAX_FAILURES);
    expect(blocked("a", T0 + MAX_FAILURES + 1)).toBe(true);
    expect(blocked("b", T0 + MAX_FAILURES + 1)).toBe(false);
  });

  it("lets the address try again once the window has passed", () => {
    for (let i = 0; i < MAX_FAILURES; i++) recordFailure("c", T0);
    expect(blocked("c", T0 + WINDOW_MS - 1)).toBe(true);
    expect(blocked("c", T0 + WINDOW_MS)).toBe(false);
    // The failures after the window start a new count.
    recordFailure("c", T0 + WINDOW_MS);
    expect(blocked("c", T0 + WINDOW_MS + 1)).toBe(false);
  });

  it("forgives the failures on a right password", () => {
    for (let i = 0; i < MAX_FAILURES; i++) recordFailure("d", T0);
    expect(blocked("d", T0)).toBe(true);
    clearFailures("d");
    expect(blocked("d", T0)).toBe(false);
  });
});

describe("clientAddress", () => {
  it("reads Cloudflare's header and puts everything else in one bucket", () => {
    expect(clientAddress(new Headers({ "cf-connecting-ip": "203.0.113.9" }))).toBe("203.0.113.9");
    // A forwarded-for header is the caller's to write, so it cannot buy a fresh bucket.
    expect(clientAddress(new Headers({ "x-forwarded-for": "198.51.100.4, 10.0.0.1" }))).toBe(
      "local",
    );
    expect(clientAddress(new Headers())).toBe("local");
  });
});
