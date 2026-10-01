import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { z } from "zod";
import { overrideExplanation, simulateMissedSession, switchInterest } from "./actions";
import { ADMIN_NOTICES, NOTICE_KEYS } from "./notices";
import { costCents, type TokenUsage } from "@/coach/pricing";
import { DEMO_STUDENT_ID } from "@/db/demo";
import { getStudent } from "@/db/queries/students";
import { usageBySession } from "@/db/queries/usage";
import { INTERESTS } from "@/engine/types";
import { calendarDay, formatDay } from "@/parent/progress";
import { overrideTarget } from "@/session/override";

export const metadata: Metadata = { title: "Admin · Klade" };

const SECTION = "flex flex-col gap-4 rounded-lg border border-zinc-200 p-6 dark:border-zinc-800";
const HEADING = "text-lg font-semibold";
const MUTED = "text-zinc-600 dark:text-zinc-400";

const NoticeParam = z.enum(NOTICE_KEYS);

type UsageRow = Awaited<ReturnType<typeof usageBySession>>[number];

interface SessionCost extends TokenUsage {
  sessionLogId: string;
  title: string;
  startedAt: Date | null;
  calls: number;
  /** Null when a call used a model with no price on file. */
  cents: number | null;
}

/** One row per session: the per-model rows summed, each priced at its own model's rates. */
function sessionCosts(rows: readonly UsageRow[]): SessionCost[] {
  const sessions = new Map<string, SessionCost>();
  for (const row of rows) {
    if (row.sessionLogId === null) continue;
    const cents = costCents(row.model, row);
    const entry = sessions.get(row.sessionLogId);
    if (!entry) {
      sessions.set(row.sessionLogId, { ...row, sessionLogId: row.sessionLogId, cents });
      continue;
    }
    entry.calls += row.calls;
    entry.inputTokens += row.inputTokens;
    entry.outputTokens += row.outputTokens;
    entry.cacheReadTokens += row.cacheReadTokens;
    entry.cacheWriteTokens += row.cacheWriteTokens;
    entry.cents = entry.cents === null || cents === null ? null : entry.cents + cents;
  }
  return [...sessions.values()];
}

function formatCents(cents: number | null): string {
  return cents === null ? "no price" : `${cents.toFixed(2)}¢`;
}

const count = new Intl.NumberFormat("en-US");

const COLUMNS = ["Calls", "Tokens in", "Out", "Cache read", "Cache write", "Cost"] as const;

export default async function AdminPanel({ searchParams }: PageProps<"/admin">) {
  await connection();
  const [params, student, usage, override] = await Promise.all([
    searchParams,
    getStudent(DEMO_STUDENT_ID),
    usageBySession(DEMO_STUDENT_ID),
    overrideTarget(DEMO_STUDENT_ID),
  ]);
  const notice = NoticeParam.safeParse(params.notice);
  const costs = sessionCosts(usage);
  const total = costs.reduce(
    (sum, row) => ({
      calls: sum.calls + row.calls,
      cents: sum.cents === null || row.cents === null ? null : sum.cents + row.cents,
    }),
    { calls: 0, cents: 0 as number | null },
  );

  if (!student) return <p>No student yet. Run npm run db:seed to add the demo student.</p>;

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">Admin</h1>
        <p className={MUTED}>Demo controls for {student.name}. The student never sees this page.</p>
        <nav aria-label="Views" className="flex gap-4">
          <Link href="/parent" className="underline underline-offset-2">
            Parent view
          </Link>
          <Link href="/student" className="underline underline-offset-2">
            Student view
          </Link>
        </nav>
      </header>

      {notice.success && (
        <p role="status" className="rounded-md bg-zinc-100 px-4 py-3 dark:bg-zinc-900">
          {ADMIN_NOTICES[notice.data]}
        </p>
      )}

      <section aria-labelledby="missed-heading" className={SECTION}>
        <h2 id="missed-heading" className={HEADING}>
          Missed session
        </h2>
        <p className={MUTED}>
          Marks today&apos;s scheduled session missed, raises the same-day alert and updates the
          behind count on the parent view.
        </p>
        <form action={simulateMissedSession}>
          <button type="submit" className="btn-primary">
            Simulate missed session
          </button>
        </form>
      </section>

      <section aria-labelledby="interest-heading" className={SECTION}>
        <h2 id="interest-heading" className={HEADING}>
          Interest
        </h2>
        <form action={switchInterest} className="flex flex-col gap-4">
          <fieldset className="flex flex-wrap gap-x-6 gap-y-2">
            <legend className={`mb-2 ${MUTED}`}>
              Now: {student.interests.join(" and ")}. Same math, a different frame.
            </legend>
            {INTERESTS.map((interest) => (
              <label key={interest} className="flex items-center gap-2 capitalize">
                <input
                  type="radio"
                  name="interest"
                  value={interest}
                  defaultChecked={interest === student.interests[0]}
                />
                {interest}
              </label>
            ))}
          </fieldset>
          <div>
            <button type="submit" className="btn-secondary">
              Switch interest
            </button>
          </div>
        </form>
      </section>

      <section aria-labelledby="override-heading" className={SECTION}>
        <h2 id="override-heading" className={HEADING}>
          Explain-back override
        </h2>
        <p className={MUTED}>
          Passes the open session&apos;s explain-back without grading, for when the grader is down.
          The parent view tags it as an override.
        </p>
        {override.ok ? (
          <form action={overrideExplanation}>
            <button type="submit" className="btn-secondary">
              Override explain-back
            </button>
          </form>
        ) : (
          <p>{ADMIN_NOTICES[override.error]}</p>
        )}
      </section>

      <section aria-labelledby="cost-heading" className={SECTION}>
        <h2 id="cost-heading" className={HEADING}>
          AI cost per session
        </h2>
        {costs.length === 0 ? (
          <p className={MUTED}>No model calls logged yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className={MUTED}>
                  <th scope="col" className="pb-2 font-medium">
                    Session
                  </th>
                  {COLUMNS.map((column) => (
                    <th key={column} scope="col" className="pb-2 text-right font-medium">
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="font-mono">
                {costs.map((row) => (
                  <tr
                    key={row.sessionLogId}
                    className="border-t border-zinc-200 dark:border-zinc-800"
                  >
                    <th scope="row" className="py-2 font-sans font-normal">
                      {row.startedAt ? `${formatDay(calendarDay(row.startedAt))}, ` : ""}
                      {row.title}
                    </th>
                    <td className="py-2 text-right">{count.format(row.calls)}</td>
                    <td className="py-2 text-right">{count.format(row.inputTokens)}</td>
                    <td className="py-2 text-right">{count.format(row.outputTokens)}</td>
                    <td className="py-2 text-right">{count.format(row.cacheReadTokens)}</td>
                    <td className="py-2 text-right">{count.format(row.cacheWriteTokens)}</td>
                    <td className="py-2 text-right">{formatCents(row.cents)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-zinc-300 font-semibold dark:border-zinc-700">
                  <th scope="row" className="py-2">
                    Total
                  </th>
                  <td className="py-2 text-right font-mono">{count.format(total.calls)}</td>
                  <td colSpan={4} />
                  <td className="py-2 text-right font-mono">{formatCents(total.cents)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
