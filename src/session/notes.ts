/** The most a session's notes hold: a page of a kid's working, not an essay. */
export const NOTES_MAX_LENGTH = 2000;

/**
 * The notes as the server keeps them: plain text with line breaks and tabs, every other control
 * character dropped, Windows line endings folded. The length cap applies to the result. Pure, and
 * free of zod, because the notes panel imports this module into the browser.
 */
export function normalizeNotes(text: string): string {
  return text.replace(/\r\n?/g, "\n").replace(/[^\P{Cc}\n\t]/gu, "");
}
