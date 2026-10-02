import { historyMinutes, historyResult, sortedHistory, type HistoryRow } from "./history";
import { formatDay } from "./progress";

interface HistoryTableProps {
  rows: readonly (HistoryRow & { id: string; title: string })[];
}

/** Sessions and missed days, latest first: date, concept, outcome, minutes. Both views render it. */
export function HistoryTable({ rows }: HistoryTableProps) {
  const sorted = sortedHistory(rows);
  if (sorted.length === 0) {
    return <p className="text-zinc-600 dark:text-zinc-400">No sessions yet.</p>;
  }
  return (
    <table className="w-full text-left text-sm">
      <thead>
        <tr className="text-zinc-600 dark:text-zinc-400">
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
        {sorted.map(({ row, day }) => (
          <tr key={row.id} className="border-t border-zinc-200 dark:border-zinc-800">
            <td className="py-2 pr-4 whitespace-nowrap">{day ? formatDay(day) : ""}</td>
            <td className="py-2 pr-4">{row.title}</td>
            <td className="py-2 pr-4 whitespace-nowrap">{historyResult(row)}</td>
            <td className="py-2 text-right tabular-nums">{historyMinutes(row)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
