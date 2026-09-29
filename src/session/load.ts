import { sessionContent } from "@/content/sessions";
import { solvedProblems } from "@/db/queries/attempts";
import { getSession } from "@/db/queries/sessions";
import { problemKey } from "@/session/blocks";
import { problemCounts, sessionProblems } from "@/session/problems";

/**
 * A student's session log with its problems and the keys of the ones already solved, in one round
 * trip. Undefined when the student has no log with that id.
 */
export async function loadSession(id: string, studentId: string) {
  const [session, solved] = await Promise.all([getSession(id, studentId), solvedProblems(id)]);
  if (!session) return undefined;
  const content = sessionContent(session.contentKey);
  return {
    session,
    problems: sessionProblems(content, session.seed),
    counts: problemCounts(content),
    solved: new Set(solved.map((p) => problemKey(p.block, p.problemIndex))),
  };
}
