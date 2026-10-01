import { count, desc, eq, sum } from "drizzle-orm";
import { getDb } from "@/db/client";
import { aiUsage, sessionLogs, sessionTemplates } from "@/db/schema";

/** The student's model calls summed per session and model, most recent session first. */
export async function usageBySession(studentId: string) {
  const db = await getDb();
  return db
    .select({
      sessionLogId: aiUsage.sessionLogId,
      title: sessionTemplates.title,
      startedAt: sessionLogs.startedAt,
      model: aiUsage.model,
      calls: count(),
      inputTokens: sum(aiUsage.inputTokens).mapWith(Number),
      outputTokens: sum(aiUsage.outputTokens).mapWith(Number),
      cacheReadTokens: sum(aiUsage.cacheReadTokens).mapWith(Number),
      cacheWriteTokens: sum(aiUsage.cacheWriteTokens).mapWith(Number),
    })
    .from(aiUsage)
    .innerJoin(sessionLogs, eq(sessionLogs.id, aiUsage.sessionLogId))
    .innerJoin(sessionTemplates, eq(sessionTemplates.id, sessionLogs.sessionTemplateId))
    .where(eq(sessionLogs.studentId, studentId))
    .groupBy(aiUsage.sessionLogId, aiUsage.model)
    .orderBy(desc(sessionLogs.startedAt));
}
