import { instanceValues } from "@/engine/generate";
import type { ProblemInstance } from "@/engine/types";

/**
 * The output filter: hides a leaked final value before it reaches the student. Deterministic, so
 * the red-team script and the route agree on what counts as a leak.
 */

/** What the filter puts in place of a leaked value. */
export const REDACTED = "?";

/** What the output filter hides. */
export interface FilterTarget {
  solution: number;
  /**
   * Magnitudes written in the equation. A hint may name them ("subtract 5 from both sides"), so
   * when the solution is one of them only a result cue ("x = 5", "you get 5") counts as a leak.
   */
  given: readonly number[];
}

export function filterTarget(instance: ProblemInstance): FilterTarget {
  return {
    solution: instance.solution,
    given: Object.values(instanceValues(instance)).map(Math.abs),
  };
}

const ONES = [
  "zero",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
  "eleven",
  "twelve",
  "thirteen",
  "fourteen",
  "fifteen",
  "sixteen",
  "seventeen",
  "eighteen",
  "nineteen",
];
const TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];

/** `n` spelled out, 0 to 999, as a pattern that takes a hyphen or a space between parts. */
function spelledOut(n: number): string | null {
  if (n > 999) return null;
  const parts: string[] = [];
  const hundreds = Math.floor(n / 100);
  const rest = n % 100;
  if (hundreds > 0) parts.push(`${ONES[hundreds]} hundred`);
  if (rest >= 20) {
    const ones = rest % 10;
    parts.push(
      ones === 0 ? TENS[Math.floor(rest / 10)] : `${TENS[Math.floor(rest / 10)]}[- ]${ONES[ones]}`,
    );
  } else if (rest > 0 || parts.length === 0) {
    parts.push(ONES[rest]);
  }
  return parts.join("(?: and)? ");
}

// Hyphen, minus sign, en dash: the ways a negative gets written.
const MINUS = "[-\\u2212\\u2013]";
const SIGN = "(?:[-+\\u2212\\u2013]\\s?|negative |minus )?";
// Not part of a longer number ("15", "5.5") and not a coefficient ("5x").
const AFTER_DIGITS = "(?!\\.?\\d|\\s?x\\b)";
const CUES = [
  "x\\s*(?:=|:|→|->|is|equals|would be|will be|must be|should be|has to be|comes out to|works out to|turns out to be)",
  "(?:answer|solution|result|value(?: of x)?)\\s*(?:is|=|:|would be|will be|equals|comes out to)",
  "(?:=|equals|is|get|gets|give|gives|gives you|leave|leaves|leaves you with|make|makes|become|becomes|yield|yields|comes out to|works out to)",
].join("|");
const CLAIMS =
  "\\s*(?:is|=|would be)\\s*(?:the |your )?(?:answer|solution|value|result|right|correct)";

// Below this, a bare number or word is everyday tutoring ("one side", "step 2"), not a leak.
const BARE_MINIMUM = 4;

/**
 * Patterns that match a leaked solution, and nothing else, so the match can be replaced whole.
 * Every pattern is case-insensitive and global.
 */
function leakPatterns({ solution, given }: FilterTarget): RegExp[] {
  const magnitude = Math.abs(solution);
  const digits = `${magnitude}(?:\\.0+)?`;
  const words = spelledOut(magnitude);
  const forms = words === null ? digits : `(?:${digits}|${words})`;
  const patterns = [
    // After a result cue: "x = 5", "the answer is five", "you get -5".
    `(?<=(?:${CUES})\\s*)${SIGN}${forms}${AFTER_DIGITS}`,
    // Before a claim: "5 is the answer".
    `(?<![\\d.])${SIGN}${forms}(?=${CLAIMS})`,
  ];
  if (magnitude >= BARE_MINIMUM) {
    if (!given.includes(magnitude)) {
      // The number is not in the equation, so it has no business in a hint at all.
      patterns.push(
        solution < 0
          ? `(?<![\\d.])(?:${MINUS}|negative |minus )${forms}${AFTER_DIGITS}`
          : `(?<![\\d.]|${MINUS})${digits}${AFTER_DIGITS}`,
      );
    }
    if (words !== null) {
      // A hint never needs the answer in words; only a reply dodging the digit filter would.
      patterns.push(`(?<![-\\w])(?:negative |minus )?${words}(?![-\\w])`);
    }
  }
  return patterns.map((source) => new RegExp(source, "gi"));
}

export interface Redaction {
  text: string;
  redacted: boolean;
}

function applyPatterns(text: string, patterns: readonly RegExp[]): Redaction {
  let redacted = false;
  let out = text;
  for (const pattern of patterns) {
    out = out.replace(pattern, () => {
      redacted = true;
      return REDACTED;
    });
  }
  return { text: out, redacted };
}

/** Hides the solution wherever `text` states it: as digits, after `x =`, or spelled out. */
export function redactSolution(text: string, target: FilterTarget): Redaction {
  return applyPatterns(text, leakPatterns(target));
}

/**
 * Splits `buffer` into the complete sentences at its head and the tail that may still grow. A
 * line break alone does not end a sentence, so "x =" on one line and the value on the next are
 * filtered together.
 */
export function splitComplete(buffer: string): { complete: string; rest: string } {
  let end = 0;
  for (const match of buffer.matchAll(/[.!?](?=\s)/g)) end = match.index + 1;
  return { complete: buffer.slice(0, end), rest: buffer.slice(end) };
}

export interface RedactingStream {
  /** Takes the next chunk of model output and returns the text now safe to send. */
  push: (chunk: string) => string;
  /** Filters and returns whatever is still held, at the end of the stream. */
  flush: () => string;
  /** Whether any chunk so far leaked the solution. */
  redacted: () => boolean;
}

/**
 * Runs `redactSolution` over a stream one complete sentence at a time. A leak split across two
 * chunks ("x = 1" then "5") is still one sentence when it is filtered.
 */
export function createRedactingStream(target: FilterTarget): RedactingStream {
  const patterns = leakPatterns(target);
  let buffer = "";
  let redacted = false;
  const emit = (text: string): string => {
    if (text === "") return "";
    const result = applyPatterns(text, patterns);
    redacted ||= result.redacted;
    return result.text;
  };
  return {
    push: (chunk) => {
      const { complete, rest } = splitComplete(buffer + chunk);
      buffer = rest;
      return emit(complete);
    },
    flush: () => {
      const held = buffer;
      buffer = "";
      return emit(held);
    },
    redacted: () => redacted,
  };
}
