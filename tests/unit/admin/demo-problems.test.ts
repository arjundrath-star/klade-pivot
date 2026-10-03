import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { DEMO_PROBLEMS_HEADER, demoProblemCells, demoProblemsTable } from "@/admin/demo-problems";
import { demoProblemRows, replaceDemoProblems, RUNBOOK_PATH } from "@/admin/runbook";
import { S1_DEMO_KEY } from "@/content/keys";
import { sessionContent } from "@/content/sessions";

describe("the demo session's problems", () => {
  it("list every problem of Maya's shortened session, the word problems framed in her interests", () => {
    const content = sessionContent(S1_DEMO_KEY);
    const cells = demoProblemCells();
    expect(cells).toHaveLength(content.warmup.length + content.guided.length + content.exit.length);
    expect(cells.filter((row) => row[2] !== "Solve for x.").length).toBeGreaterThan(0);
  });

  it("match the runbook's table, which the script writes and this test pins", () => {
    const runbook = readFileSync(RUNBOOK_PATH, "utf8");
    expect(demoProblemRows(runbook)).toEqual([[...DEMO_PROBLEMS_HEADER], ...demoProblemCells()]);
  });

  it("replace only the table under the heading", () => {
    const doc = [
      "# Runbook",
      "",
      "## Demo problems",
      "",
      "Intro.",
      "",
      "| old |",
      "| --- |",
      "",
      "## Next",
    ].join("\n");
    const written = replaceDemoProblems(doc, demoProblemsTable());
    expect(written.startsWith("# Runbook\n\n## Demo problems\n\nIntro.\n\n| Block |")).toBe(true);
    expect(written.endsWith("\n\n## Next")).toBe(true);
    expect(demoProblemRows(written)).toEqual([[...DEMO_PROBLEMS_HEADER], ...demoProblemCells()]);
    expect(() => replaceDemoProblems("# Runbook", "")).toThrow(/no "## Demo problems"/);
  });
});
