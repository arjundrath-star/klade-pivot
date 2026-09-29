import { allowedCount, excludedC } from "@/engine/generate";
import type { IntRange, ProblemTemplate, Structure, ValidTemplate } from "@/engine/types";

const PLACEHOLDERS: Record<Structure, readonly string[]> = {
  "two-step": ["a", "b", "c"],
  "both-sides": ["a", "b", "c", "d"],
  distribution: ["a", "b", "c", "d"],
};

/** A `{name}` token. Not global: callers that scan a whole string copy it with the `g` flag. */
export const PLACEHOLDER = /\{([^{}]*)\}/;

// Bounds every drawn value so derived constants (at most ~2 * 1000^2) stay exact integers and the
// per-value validation loop stays cheap. No realistic range comes close.
const MAX_MAGNITUDE = 1000;

function rangeIssues(name: string, range: IntRange): string[] {
  if (!Number.isSafeInteger(range.min) || !Number.isSafeInteger(range.max)) {
    return [`range ${name} must have integer bounds`];
  }
  if (range.min > range.max) return [`range ${name} is empty (min > max)`];
  return range.min < -MAX_MAGNITUDE || range.max > MAX_MAGNITUDE
    ? [`range ${name} must stay between -${MAX_MAGNITUDE} and ${MAX_MAGNITUDE}`]
    : [];
}

function drawIssues(template: ProblemTemplate): string[] {
  const { ranges } = template;
  const issues = (["a", "b"] as const)
    .filter((name) => allowedCount(ranges[name], [0]) === 0)
    .map((name) => `range ${name} has no nonzero value`);
  if (template.structure === "two-step" || issues.length > 0) return issues;

  for (let a = ranges.a.min; a <= ranges.a.max; a += 1) {
    if (a !== 0 && allowedCount(template.ranges.c, excludedC(template.structure, a)) === 0) {
      issues.push(`range c has no allowed value when a = ${a}`);
    }
  }
  return issues;
}

/**
 * Word problems count real things, so every number a student reads must be positive. Drawn values
 * need positive ranges; the derived constant then is too, except for both-sides, where
 * `d = (a - c)x + b` needs `a` to always exceed `c`.
 */
function wordIssues(template: ProblemTemplate): string[] {
  if (template.kind !== "word") return [];
  const ranges: Record<string, IntRange> = template.ranges;
  const issues = Object.entries(ranges)
    .filter(([, range]) => range.min < 1)
    .map(([name]) => `word problem range ${name} must be positive`);
  if (template.structure === "both-sides" && template.ranges.a.min <= template.ranges.c.max) {
    issues.push("word problem range a must sit above range c so d stays positive");
  }
  return issues;
}

function variantIssues(template: ProblemTemplate): string[] {
  const allowed = PLACEHOLDERS[template.structure];
  const tokens = new RegExp(PLACEHOLDER, "g");
  return Object.entries(template.variants).flatMap(([variant, text]) => {
    const issues = text.trim() === "" ? [`variant ${variant} is empty`] : [];
    for (const [token, name] of text.matchAll(tokens)) {
      if (!allowed.includes(name))
        issues.push(`variant ${variant} has unknown placeholder ${token}`);
    }
    if (/[{}]/.test(text.replace(tokens, ""))) issues.push(`variant ${variant} has a stray brace`);
    return issues;
  });
}

export function templateIssues(template: ProblemTemplate): string[] {
  const issues: string[] = [];
  if (template.key.trim() === "") issues.push("key is empty");

  const ranges: Record<string, IntRange> = template.ranges;
  const malformed = Object.entries(ranges).flatMap(([name, range]) => rangeIssues(name, range));
  // Draw and word checks assume well-formed ranges.
  if (malformed.length > 0) issues.push(...malformed);
  else issues.push(...drawIssues(template), ...wordIssues(template));

  return [...issues, ...variantIssues(template)];
}

/** Validates a template when its module loads, so a content mistake fails the build and tests. */
export function defineTemplate<T extends ProblemTemplate>(template: T): ValidTemplate<T> {
  const issues = templateIssues(template);
  if (issues.length > 0) {
    throw new Error(`Invalid problem template "${template.key}": ${issues.join("; ")}`);
  }
  return template as ValidTemplate<T>;
}
