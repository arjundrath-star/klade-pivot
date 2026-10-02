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

/** Sessions and missed days, latest first: date, concept, outcome, minutes. */
export function HistoryTable({ rows }: HistoryTableProps) {
  const sorted = sortedHistory(rows);
  if (sorted.length === 0) {
    return <p className="text-ink-soft">No sessions yet.</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="text-ink-soft">
            <th scope="col" className="pr-4 pb-2 font-medium">
              Date
            </th>
            <th scope="col" className="pr-4 pb-2 font-medium">
              Concept
            </th>
            <th scope="col" className="pr-4 pb-2 font-medium whitespace-nowrap">
              Outcome
            </th>
            <th scope="col" className="pb-2 text-right font-medium">
              Minutes
            </th>
          </tr>
        </thead>
        <tbody>
          {sorted.map(({ row, day }) => {
            const result = historyResult(row);
            return (
              <tr key={row.id} className="border-t border-line">
                <td className="py-2.5 pr-4 whitespace-nowrap">{day ? formatDay(day) : ""}</td>
                <td className="py-2.5 pr-4">{row.title}</td>
                <td className={`py-2.5 pr-4 font-medium whitespace-nowrap ${resultClass(result)}`}>
                  {result}
                </td>
                <td className="py-2.5 text-right tabular-nums">{historyMinutes(row)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
