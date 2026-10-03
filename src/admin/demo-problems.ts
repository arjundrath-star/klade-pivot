import { S1_KEY } from "@/content/keys";
import { sessionContent } from "@/content/sessions";
import {
  DEMO_INTERESTS,
  DEMO_SESSION_SEED,
  DEMO_STUDENT_ID,
  sessionContentKeyFor,
} from "@/db/demo";
import { formatEquation } from "@/engine/format";
import { generateInstance } from "@/engine/generate";
import { BLOCKS } from "@/session/blocks";
import { renderSessionProblem, sessionProblems } from "@/session/problems";

/** The heading row of the runbook's "Demo problems" table. */
export const DEMO_PROBLEMS_HEADER = ["Block", "Problem", "Text", "Equation", "Answer"] as const;

/**
 * Every problem of the demo student's session, in order, as table cells: her content variant
 * drawn from `DEMO_SESSION_SEED` through the same code the session page uses, framed in her
 * seeded interests, and numbered as the workspace's counter says it.
 */
export function demoProblemCells(): string[][] {
  const content = sessionContent(sessionContentKeyFor(DEMO_STUDENT_ID, S1_KEY));
  return sessionProblems(content, DEMO_SESSION_SEED).map((problem) => {
    const instance = generateInstance(problem.template, problem.seed);
    return [
      BLOCKS[problem.block].label,
      String(problem.index + 1),
      renderSessionProblem(problem, DEMO_INTERESTS).text,
      formatEquation(instance),
      `x = ${instance.solution}`,
    ];
  });
}

/** The "Demo problems" table as Markdown. */
export function demoProblemsTable(): string {
  const row = (cells: readonly string[]) => `| ${cells.join(" | ")} |`;
  return [
    row(DEMO_PROBLEMS_HEADER),
    row(DEMO_PROBLEMS_HEADER.map(() => "---")),
    ...demoProblemCells().map(row),
  ].join("\n");
}
