import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { alerts, students } from "@/db/schema";

type NewAlert = Omit<typeof alerts.$inferInsert, "id" | "createdAt" | "deliveredAt">;

/** Raises an alert. False when the session already raised one of this type. */
export async function recordAlert(alert: NewAlert): Promise<boolean> {
  const db = await getDb();
  const inserted = await db
    .insert(alerts)
    .values(alert)
    .onConflictDoNothing()
    .returning({ id: alerts.id });
  return inserted.length > 0;
}

/** The family's most recent alerts, newest first. */
export async function familyAlerts(familyId: string, limit = 20) {
  const db = await getDb();
  return db
    .select({
      id: alerts.id,
      message: alerts.message,
      createdAt: alerts.createdAt,
    })
    .from(alerts)
    .where(eq(alerts.familyId, familyId))
    .orderBy(desc(alerts.createdAt))
    .limit(limit);
}

/** One of the family's alerts with the student's first name, if it belongs to the family. */
export async function familyAlert(id: string, familyId: string) {
  const db = await getDb();
  const [alert] = await db
    .select({ type: alerts.type, message: alerts.message, studentName: students.name })
    .from(alerts)
    .innerJoin(students, eq(students.id, alerts.studentId))
    .where(and(eq(alerts.id, id), eq(alerts.familyId, familyId)));
  return alert;
}
