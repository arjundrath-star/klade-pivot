/** Field rules the onboarding form and the server share. The server's zod schema is the check. */

/** A first name: letters, then letters, spaces, hyphens or apostrophes ("Mary-Kate", "D'Andre"). */
export const NAME_PATTERN = /^\p{L}[\p{L}\p{M}' -]*$/u;

export const NAME_MAX = 30;

/** The course is built for grades 6 to 10 (memo §5). */
export const GRADES = [6, 7, 8, 9, 10] as const;

/** A trimmed first name that fits the rules, or null. */
export function cleanName(raw: string): string | null {
  const name = raw.trim();
  return name.length > 0 && name.length <= NAME_MAX && NAME_PATTERN.test(name) ? name : null;
}
