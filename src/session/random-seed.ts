import { randomInt } from "node:crypto";

/** A seed for a session's problems: 32 random bits, drawn once when the session row is written. */
export function randomSeed(): number {
  return randomInt(0, 2 ** 32);
}
