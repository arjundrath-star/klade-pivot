import { createHash, createHmac, timingSafeEqual } from "node:crypto";

/**
 * The shared-password gate in front of the parent and admin views (milestone 12). The cookie holds
 * an expiry and an HMAC of it under the password, never the password itself, so a captured cookie
 * is good only until it expires or the password changes.
 */

export const GATE_COOKIE = "klade_gate";

/** How long one sign-in lasts: a demo day. */
export const GATE_MAX_AGE_SECONDS = 24 * 60 * 60;

const PURPOSE = "klade-gate-v1";

const TOKEN_PATTERN = /^(\d{1,16})\.([0-9a-f]{64})$/;

function signature(password: string, expiresAt: number): Buffer {
  return createHmac("sha256", password).update(`${PURPOSE}:${expiresAt}`).digest();
}

/** The cookie value for a sign-in that lasts until `expiresAt` (epoch milliseconds). */
export function gateToken(password: string, expiresAt: number): string {
  return `${expiresAt}.${signature(password, expiresAt).toString("hex")}`;
}

/** The cookie value for a sign-in made at `now` that lasts `GATE_MAX_AGE_SECONDS`. */
export function freshGateToken(password: string, now = Date.now()): string {
  return gateToken(password, now + GATE_MAX_AGE_SECONDS * 1000);
}

/**
 * Whether the cookie opens the gate: a well-formed, unexpired token signed under the password. A
 * server with no password configured stays closed. The comparison takes the same time whether the
 * signature is wrong in its first byte or its last.
 */
export function gateOpen(
  token: string | undefined,
  password: string | undefined,
  now = Date.now(),
): boolean {
  if (!password || !token) return false;
  const match = TOKEN_PATTERN.exec(token);
  if (!match) return false;
  const expiresAt = Number(match[1]);
  if (expiresAt <= now) return false;
  return timingSafeEqual(Buffer.from(match[2], "hex"), signature(password, expiresAt));
}

/** Whether two secrets are equal, in time that does not depend on where they first differ. */
export function secretsMatch(given: string, expected: string): boolean {
  const digest = (text: string) => createHash("sha256").update(text).digest();
  return timingSafeEqual(digest(given), digest(expected));
}
