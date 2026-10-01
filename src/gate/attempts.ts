/**
 * Slows down password guessing at the gate: after `MAX_FAILURES` wrong tries from one address
 * inside the window, the address waits out the rest of the window. In memory, per server process,
 * which is the one `next start` the demo runs on.
 */

export const MAX_FAILURES = 5;

export const WINDOW_MS = 15 * 60 * 1000;

interface Failures {
  count: number;
  /** When the window started. */
  since: number;
}

const failures = new Map<string, Failures>();

function current(address: string, now: number): Failures | undefined {
  const entry = failures.get(address);
  if (entry && now - entry.since >= WINDOW_MS) {
    failures.delete(address);
    return undefined;
  }
  return entry;
}

/** Whether the address has used up its tries for this window. */
export function blocked(address: string, now = Date.now()): boolean {
  const entry = current(address, now);
  return entry !== undefined && entry.count >= MAX_FAILURES;
}

export function recordFailure(address: string, now = Date.now()): void {
  const entry = current(address, now);
  if (entry) entry.count += 1;
  else failures.set(address, { count: 1, since: now });
  // Addresses whose window has passed are not worth keeping.
  for (const [other, { since }] of failures) {
    if (now - since >= WINDOW_MS) failures.delete(other);
  }
}

/** A right password forgives the earlier wrong ones. */
export function clearFailures(address: string): void {
  failures.delete(address);
}

/**
 * The address a request came from: the header Cloudflare sets in front of the tunnel, which is the
 * only way to the origin in production. Anything else (the local fallback, a direct hit) shares
 * one bucket, since a forwarded-for header is whatever the caller wrote in it.
 */
export function clientAddress(headers: Headers): string {
  return headers.get("cf-connecting-ip") ?? "local";
}
