import { s1 } from "@/content/algebra1/linear-equations/s1";
import { s1Demo } from "@/content/algebra1/linear-equations/s1-demo";
import { S1_DEMO_KEY, S1_KEY } from "@/content/keys";
import type { SessionContent } from "@/content/types";

/**
 * Session content by the `content_key` stored on each session template row, and the demo
 * student's variants, which `sessionContentKeyFor` picks in place of a template's own.
 */
const SESSIONS: ReadonlyMap<string, SessionContent> = new Map([
  [S1_KEY, s1],
  [S1_DEMO_KEY, s1Demo],
]);

/**
 * Throws on an unknown key: every session a student opens must point at content that ships with
 * the app. The course map lists concepts with no content yet; the planner never opens those.
 */
export function sessionContent(key: string): SessionContent {
  const content = SESSIONS.get(key);
  if (!content) throw new Error(`No session content for key "${key}"`);
  return content;
}
