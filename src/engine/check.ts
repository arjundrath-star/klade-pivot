import { equals, formatRational, tryRational, type Rational } from "@/engine/rational";
import type { AnswerCheck } from "@/engine/types";

// Optional "x =" prefix, then an optional sign (ASCII hyphen or U+2212 minus) and the magnitude.
const ANSWER = /^(?:x\s*=\s*)?([+\-\u2212]?)(\S+)$/i;
const FRACTION = /^(\d+)\/(\d+)$/;
const DECIMAL = /^(\d*)\.(\d+)$/;
const INTEGER = /^\d+$/;

function parseMagnitude(body: string): [num: number, den: number] | null {
  const fraction = FRACTION.exec(body);
  if (fraction) return [Number(fraction[1]), Number(fraction[2])];
  const decimal = DECIMAL.exec(body);
  if (decimal) {
    // Trailing zeros change nothing, so "5.000…" stays exact however many zeros follow.
    const fractional = decimal[2].replace(/0+$/, "");
    return [Number(decimal[1] + fractional), 10 ** fractional.length];
  }
  return INTEGER.test(body) ? [Number(body), 1] : null;
}

/**
 * Parses a typed answer into an exact rational, or null when it is not a well-formed number.
 * Digit strings parse exactly up to 2^53; anything larger fails `tryRational`'s safe-integer check.
 */
export function parseAnswer(input: string): Rational | null {
  const match = ANSWER.exec(input.trim());
  if (!match) return null;
  const [, sign, body] = match;
  const magnitude = parseMagnitude(body);
  if (!magnitude) return null;
  const [num, den] = magnitude;
  return tryRational(sign === "-" || sign === "\u2212" ? -num : num, den);
}

/** Deterministic, exact answer check. Accepts `5`, `x = 5`, `-3/2`, `0.5` and equivalent forms. */
export function checkAnswer(input: string, expected: Rational): AnswerCheck {
  const parsed = parseAnswer(input);
  return {
    correct: parsed !== null && equals(parsed, expected),
    normalized: parsed === null ? null : formatRational(parsed),
    expected: formatRational(expected),
  };
}
