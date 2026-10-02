// Writes the "Demo problems" table in docs/demo-runbook.md from the code that draws the demo
// session (npm run docs:demo-problems). tests/unit/admin/demo-problems.test.ts fails while the
// table and the code disagree.
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { demoProblemsTable } from "@/admin/demo-problems";
import { replaceDemoProblems, RUNBOOK_PATH } from "@/admin/runbook";

function main(): void {
  const runbook = readFileSync(RUNBOOK_PATH, "utf8");
  writeFileSync(RUNBOOK_PATH, replaceDemoProblems(runbook, demoProblemsTable()));
  execFileSync("npx", ["prettier", "--write", RUNBOOK_PATH], { stdio: "inherit" });
  console.log(`wrote the demo problems to ${RUNBOOK_PATH}`);
}

main();
