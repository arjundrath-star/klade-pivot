import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { ParentShell } from "../parent-shell";
import { Card, cardClass } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { familyAlerts } from "@/db/queries/alerts";
import { getStudent } from "@/db/queries/students";
import { gatedFamily } from "@/gate/server";
import { calendarDay, formatDay } from "@/parent/progress";

export const metadata: Metadata = { title: "Alerts" };

export default async function AlertsPage() {
  await connection();
  const { familyId, studentId } = await gatedFamily("/parent/alerts");
  const [student, alerts] = await Promise.all([getStudent(studentId), familyAlerts(familyId)]);

  return (
    <ParentShell active="/parent/alerts" student={student}>
      {() => (
        <section aria-labelledby="alerts-heading" className="flex max-w-3xl flex-col gap-6">
          <PageHeader id="alerts-heading" title="Alerts">
            <p>
              The same-day emails you get when a session is missed or mastered. Each one is kept
              here.
            </p>
          </PageHeader>
          {alerts.length === 0 ? (
            <Card>
              <p className="max-w-prose text-ink-soft">
                No alerts yet. You get one the same day a session is missed or mastered, and it
                stays here.
              </p>
            </Card>
          ) : (
            <ul className="flex flex-col gap-3">
              {alerts.map((alert) => (
                <li key={alert.id} className={`${cardClass("today", "sm")} flex flex-col gap-2`}>
                  <p className="font-medium">{alert.message}</p>
                  <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-soft">
                    <span>{formatDay(calendarDay(alert.createdAt))}</span>
                    <Link href={`/parent/alerts/${alert.id}/preview`} className="link">
                      Email preview
                    </Link>
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </ParentShell>
  );
}
