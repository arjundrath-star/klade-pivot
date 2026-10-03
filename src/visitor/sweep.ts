import { deleteStaleVisitors } from "@/db/visitors";

/** How often the sweep runs at most, per server process. */
export const SWEEP_INTERVAL_MS = 60 * 60 * 1000;

let lastSweepAt = Number.NEGATIVE_INFINITY;

/**
 * Removes visitors' copies older than 48 hours, at most once an hour, on the request that asks
 * (the one that makes a new copy). No cron: a request is the only thing that runs here. Returns
 * how many families went, or null when the hour is not up. A sweep that fails counts for
 * nothing: the next request tries again, and the failure is the request's to report.
 */
export async function sweepVisitors(now = new Date()): Promise<number | null> {
  if (now.getTime() - lastSweepAt < SWEEP_INTERVAL_MS) return null;
  const removed = await deleteStaleVisitors(now);
  lastSweepAt = now.getTime();
  return removed;
}
