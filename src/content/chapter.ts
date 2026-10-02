import type { Chapter } from "@/content/types";

export const KEY_LEARNINGS_MIN = 5;
export const KEY_LEARNINGS_MAX = 7;

export function chapterIssues(source: Omit<Chapter, "keyLearnings">): string[] {
  const issues: string[] = [];
  const ids = new Set<string>();
  for (const section of source.sections) {
    if (ids.has(section.id)) issues.push(`section id "${section.id}" is used twice`);
    ids.add(section.id);
    if (section.paragraphs.length === 0) issues.push(`section "${section.id}" has no paragraphs`);
  }
  const summaries = source.sections.filter((section) => section.points !== undefined);
  if (summaries.length !== 1) {
    issues.push(`${summaries.length} sections list key learnings; exactly one must`);
  }
  for (const { id, points = [] } of summaries) {
    if (points.length < KEY_LEARNINGS_MIN || points.length > KEY_LEARNINGS_MAX) {
      issues.push(
        `section "${id}" has ${points.length} key learnings, not ${KEY_LEARNINGS_MIN} to ${KEY_LEARNINGS_MAX}`,
      );
    }
  }
  return issues;
}

/**
 * Validates a chapter when its content module loads, the way `defineTemplate` does a problem, so
 * a chapter with a repeated id or without its key learnings fails the build and tests rather than
 * a page render.
 */
export function defineChapter(source: Omit<Chapter, "keyLearnings">): Chapter {
  const issues = chapterIssues(source);
  if (issues.length > 0) {
    throw new Error(`Invalid chapter "${source.title}": ${issues.join("; ")}`);
  }
  const summary = source.sections.find((section) => section.points !== undefined);
  return { ...source, keyLearnings: summary?.points ?? [] };
}
