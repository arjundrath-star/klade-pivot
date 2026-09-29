import { s1 } from "@/content/algebra1/linear-equations/s1";
import type { SessionContent } from "@/content/types";

export const S1_KEY = "algebra1/linear-equations/s1";

/** Session content by the `content_key` stored on each session template row. */
const SESSIONS: ReadonlyMap<string, SessionContent> = new Map([[S1_KEY, s1]]);

/** Throws on an unknown key: every template row must point at content that ships with the app. */
export function sessionContent(key: string): SessionContent {
  const content = SESSIONS.get(key);
  if (!content) throw new Error(`No session content for key "${key}"`);
  return content;
}
