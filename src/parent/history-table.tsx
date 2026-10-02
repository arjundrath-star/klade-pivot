import { historyMinutes, historyResult, sortedHistory, type HistoryRow } from "./history";
import { formatDay } from "./progress";

interface HistoryTableProps {
  rows: readonly (HistoryRow & { id: string; title: string })[];
}

/** The outcome's color: green for mastery, red for a miss, ink for the rest. */
function resultClass(result: string): string {
  if (result === "Mastered") return "text-success";
  if (result === "Missed") return "text-alert";
  return "";
}

/**
 * Sessions and missed days, latest first: date, concept, outcome, minutes. The cells' spacing is
 * `table-stack` in globals.css, which under 480px stacks the rows with each cell labelled by its
 * heading.
 */
export function HistoryTable({ rows }: HistoryTableProps) {
  const sorted = sortedHistory(rows);
  if (sorted.length === 0) {
    return (
      <p className="max-w-prose text-ink-soft">
        No sessions yet. The first one shows here the day it happens, with its outcome and minutes.
      </p>
    );
  }
  return (
    <table className="table-stack w-full text-left text-sm">
      <thead>
        <tr className="text-ink-soft">
          <th scope="col" className="font-medium">
            Date
          </th>
          <th scope="col" className="font-medium">
            Concept
          </th>
          <th scope="col" className="font-medium">
            Outcome
          </th>
          <th scope="col" className="text-right font-medium">
            Minutes
          </th>
        </tr>
      </thead>
      <tbody>
        {sorted.map(({ row, day }) => {
          const result = historyResult(row);
          return (
            <tr key={row.id} className="border-t border-line">
              <td data-label="Date" className="whitespace-nowrap">
                {day ? formatDay(day) : ""}
              </td>
              <td data-label="Concept">{row.title}</td>
              <td
                data-label="Outcome"
                className={`font-medium whitespace-nowrap ${resultClass(result)}`}
              >
                {result}
              </td>
              <td data-label="Minutes" className="text-right tabular-nums">
                {historyMinutes(row)}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
