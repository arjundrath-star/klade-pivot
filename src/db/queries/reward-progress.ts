import { and, eq, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { rewardProgress, rewardUnlocks } from "@/db/schema";
import type { RewardRow } from "@/content/rewards";

/**
 * The student's completion-reward rows, each with whether it is unlocked. None for a student the
 * prototype was not seeded for.
 */
export async function rewardRows(studentId: string): Promise<RewardRow[]> {
  const db = await getDb();
  return db
    .select({
      key: rewardProgress.key,
      current: rewardProgress.current,
      target: rewardProgress.target,
      unlocked: sql<boolean>`${rewardUnlocks.id} is not null`.mapWith(Boolean),
    })
    .from(rewardProgress)
    .leftJoin(
      rewardUnlocks,
      and(
        eq(rewardUnlocks.studentId, rewardProgress.studentId),
        eq(rewardUnlocks.key, rewardProgress.key),
      ),
    )
    .where(eq(rewardProgress.studentId, studentId));
}
