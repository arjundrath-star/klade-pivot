import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import {
  overrideExplanation,
  resetDemo,
  simulateMissedSession,
  simulateSessionDay,
  switchInterest,
} from "./actions";
import { ADMIN_NOTICES, NoticeParam } from "./notices";
import { demoClockLabel } from "@/admin/controls";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Notice } from "@/components/ui/notice";
import { PanelHeader } from "@/components/ui/panel-header";
import { costCents, type TokenUsage } from "@/coach/pricing";
import { lockSettings } from "@/db/queries/lock";
import { getStudent } from "@/db/queries/students";
import { usageBySession } from "@/db/queries/usage";
import { gatedFamily } from "@/gate/server";
import { INTERESTS } from "@/engine/types";
import { timeLabel } from "@/parent/phone-rule";
import { calendarDay, formatDay } from "@/parent/progress";
import { demoClockFor } from "@/session/lock";
import { overrideTarget } from "@/session/override";

export const metadata: Metadata = { title: "Admin · Klade" };

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
  const { familyId, studentId } = await gatedFamily("/admin");
  const [params, student, usage, override, phone] = await Promise.all([
    searchParams,
    getStudent(studentId),
    usageBySession(studentId),
    overrideTarget(studentId),
    lockSettings(familyId, studentId),
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

  if (!student || !phone) {
    return <p>No student yet. Run npm run db:seed to add the demo student.</p>;
  }
  const demoClock = demoClockFor(phone.rule, phone, calendarDay(new Date()));

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <h1 className="font-display text-3xl font-bold tracking-tight">Admin</h1>
        <p className="text-ink-soft">
          Demo controls for {student.name}. The student never sees this page.
        </p>
        <nav aria-label="Views" className="flex gap-4">
          <Link href="/parent" className="link">
            Parent view
          </Link>
          <Link href="/student" className="link">
            Student view
          </Link>
        </nav>
      </header>

      {notice.success && <Notice role="status">{ADMIN_NOTICES[notice.data]}</Notice>}

      <div className="grid gap-5 md:grid-cols-2">
        <Card aria-labelledby="missed-heading" className="flex flex-col gap-4">
          <PanelHeader id="missed-heading" title="Missed session">
            <p>
              Marks today&apos;s scheduled session missed, raises the same-day alert and updates the
              behind count on the parent view.
            </p>
          </PanelHeader>
          <form action={simulateMissedSession} className="mt-auto">
            <Button type="submit">Simulate missed session</Button>
          </form>
        </Card>

        <Card aria-labelledby="phone-heading" className="flex flex-col gap-4">
          <PanelHeader id="phone-heading" title="Phone lock">
            <p>
              Moves the phone&apos;s clock to {formatDay(demoClock.day)} at{" "}
              {timeLabel(demoClock.time)}, a session day just after the lock starts, so the phone
              panel locks whatever the real time. Finishing today&apos;s session unlocks it.
              {!phone.rule &&
                " There is no phone rule yet: set one in the parent's settings first."}
            </p>
          </PanelHeader>
          <form action={simulateSessionDay} className="mt-auto">
            <Button type="submit">{demoClockLabel(phone)}</Button>
          </form>
        </Card>

        <Card aria-labelledby="reset-heading" className="flex flex-col gap-4">
          <PanelHeader id="reset-heading" title="Reset demo">
            <p>
              Puts everything back to the seeded state: {student.name} with no sessions, today on
              her schedule, her phone rule on, the real clock, no unlock, and every family added
              during a run gone. This browser acts as {student.name} again. Run it between demo
              runs, before Simulate.
            </p>
          </PanelHeader>
          <form action={resetDemo} className="mt-auto">
            <Button type="submit" variant="secondary">
              Reset demo
            </Button>
          </form>
        </Card>

        <Card aria-labelledby="interest-heading" className="flex flex-col gap-4">
          <PanelHeader id="interest-heading" title="Interest" />
          <form action={switchInterest} className="flex flex-col gap-4">
            <fieldset className="flex flex-wrap gap-x-6 gap-y-2">
              <legend className="mb-2 text-sm text-ink-soft">
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
              <Button type="submit" variant="secondary">
                Switch interest
              </Button>
            </div>
          </form>
        </Card>

        <Card aria-labelledby="override-heading" className="flex flex-col gap-4">
          <PanelHeader id="override-heading" title="Explain-back override">
            <p>
              Passes the open session&apos;s explain-back without grading, for when the grader is
              down. The parent view tags it as an override.
            </p>
          </PanelHeader>
          {override.ok ? (
            <form action={overrideExplanation} className="mt-auto">
              <Button type="submit" variant="secondary">
                Override explain-back
              </Button>
            </form>
          ) : (
            <p>{ADMIN_NOTICES[override.error]}</p>
          )}
        </Card>
      </div>

      <Card aria-labelledby="cost-heading" className="flex flex-col gap-4">
        <PanelHeader id="cost-heading" title="AI cost per session" />
        {costs.length === 0 ? (
          <p className="text-ink-soft">No model calls logged yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-ink-soft">
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
              <tbody className="tabular-nums">
                {costs.map((row) => (
                  <tr key={row.sessionLogId} className="border-t border-line">
                    <th scope="row" className="py-2 font-normal">
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
                <tr className="border-t-2 border-line-strong font-semibold tabular-nums">
                  <th scope="row" className="py-2">
                    Total
                  </th>
                  <td className="py-2 text-right">{count.format(total.calls)}</td>
                  <td colSpan={4} />
                  <td className="py-2 text-right">{formatCents(total.cents)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
