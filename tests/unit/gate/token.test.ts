import { describe, expect, it } from "vitest";
import {
  freshGateToken,
  GATE_MAX_AGE_SECONDS,
  gateOpen,
  gateToken,
  secretsMatch,
} from "@/gate/token";

const PASSWORD = "correct horse battery staple";
const NOW = Date.parse("2026-10-02T21:00:00Z");
const LATER = NOW + 60 * 60 * 1000;

describe("gateToken and gateOpen", () => {
  it("opens for a token signed under the password before it expires", () => {
    const token = gateToken(PASSWORD, LATER);
    expect(token).toMatch(/^\d+\.[0-9a-f]{64}$/);
    expect(gateToken(PASSWORD, LATER)).toBe(token);
    expect(gateOpen(token, PASSWORD, NOW)).toBe(true);
  });

  it("signs a fresh token for the full sign-in length", () => {
    const token = freshGateToken(PASSWORD, NOW);
    expect(token.startsWith(`${NOW + GATE_MAX_AGE_SECONDS * 1000}.`)).toBe(true);
    expect(gateOpen(token, PASSWORD, NOW + GATE_MAX_AGE_SECONDS * 1000 - 1)).toBe(true);
    expect(gateOpen(token, PASSWORD, NOW + GATE_MAX_AGE_SECONDS * 1000)).toBe(false);
  });

  it("stays closed once the token has expired", () => {
    const token = gateToken(PASSWORD, LATER);
    expect(gateOpen(token, PASSWORD, LATER)).toBe(false);
    expect(gateOpen(token, PASSWORD, LATER + 1)).toBe(false);
  });

  it("stays closed for a token signed under another password", () => {
    expect(gateOpen(gateToken("something else", LATER), PASSWORD, NOW)).toBe(false);
  });

  it("stays closed for a token with its expiry moved", () => {
    const [, signature] = gateToken(PASSWORD, LATER).split(".");
    expect(gateOpen(`${LATER + 1000}.${signature}`, PASSWORD, NOW)).toBe(false);
  });

  it.each(["", "garbage", "123", `${LATER}.`, `${LATER}.xyz`, `${LATER}.${"0".repeat(63)}`])(
    "stays closed for the malformed token %j",
    (token) => {
      expect(gateOpen(token, PASSWORD, NOW)).toBe(false);
    },
  );

  it("stays closed with no cookie, and on a server with no password", () => {
    const token = gateToken(PASSWORD, LATER);
    expect(gateOpen(undefined, PASSWORD, NOW)).toBe(false);
    expect(gateOpen(token, undefined, NOW)).toBe(false);
    expect(gateOpen(token, "", NOW)).toBe(false);
  });
});

it("secretsMatch compares whole secrets, whatever their lengths", () => {
  expect(secretsMatch(PASSWORD, PASSWORD)).toBe(true);
  expect(secretsMatch(PASSWORD, `${PASSWORD} `)).toBe(false);
  expect(secretsMatch("", PASSWORD)).toBe(false);
});
