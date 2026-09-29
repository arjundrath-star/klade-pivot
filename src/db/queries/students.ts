import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { students } from "@/db/schema";

export async function getStudent(id: string) {
  const db = await getDb();
  const [student] = await db
    .select({ id: students.id, name: students.name })
    .from(students)
    .where(eq(students.id, id));
  return student;
}
