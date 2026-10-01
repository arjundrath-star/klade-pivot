/** A session title as it reads mid-sentence: "Two-step equations" becomes "two-step equations". */
export function inSentence(title: string): string {
  return title.charAt(0).toLowerCase() + title.slice(1);
}
