/** The demo runbook, relative to the repo root. */
export const RUNBOOK_PATH = "docs/demo-runbook.md";

const HEADING = "## Demo problems";

/** Where the table under the "Demo problems" heading sits: its first line, and one past its last. */
function tableLines(lines: readonly string[]): { start: number; end: number } {
  const heading = lines.indexOf(HEADING);
  if (heading === -1) throw new Error(`${RUNBOOK_PATH} has no "${HEADING}" section`);
  const start = lines.findIndex((line, i) => i > heading && line.startsWith("|"));
  if (start === -1) throw new Error(`"${HEADING}" in ${RUNBOOK_PATH} has no table`);
  let end = start;
  while (end < lines.length && lines[end].startsWith("|")) end += 1;
  return { start, end };
}

/** The runbook with the "Demo problems" table replaced by `table`. */
export function replaceDemoProblems(runbook: string, table: string): string {
  const lines = runbook.split("\n");
  const { start, end } = tableLines(lines);
  return [...lines.slice(0, start), table, ...lines.slice(end)].join("\n");
}

/**
 * The cells of the "Demo problems" table, heading row first and the divider left out, trimmed so
 * a table reformatted with padded columns reads the same as the one the script wrote.
 */
export function demoProblemRows(runbook: string): string[][] {
  const lines = runbook.split("\n");
  const { start, end } = tableLines(lines);
  return lines
    .slice(start, end)
    .filter((_, i) => i !== 1)
    .map((line) =>
      line
        .slice(1, -1)
        .split("|")
        .map((cell) => cell.trim()),
    );
}
