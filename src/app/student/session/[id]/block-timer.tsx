"use client";

import { useEffect, useState } from "react";
import { formatClock } from "@/session/timer";

interface BlockTimerProps {
  /** Null for untimed students: the timer counts up with no limit. */
  budgetSeconds: number | null;
  elapsedAtEntryMs: number;
}

/** Counts down the block's time budget from the moment the block opened. */
export function BlockTimer({ budgetSeconds, elapsedAtEntryMs }: BlockTimerProps) {
  const [sinceMountMs, setSinceMountMs] = useState(0);

  useEffect(() => {
    const mountedAt = Date.now();
    const tick = setInterval(() => setSinceMountMs(Date.now() - mountedAt), 1000);
    return () => clearInterval(tick);
  }, []);

  const elapsedSeconds = (elapsedAtEntryMs + sinceMountMs) / 1000;
  const remaining = budgetSeconds === null ? null : budgetSeconds - elapsedSeconds;
  const [label, reading] =
    remaining === null
      ? ["Time in this block", formatClock(elapsedSeconds)]
      : remaining >= 0
        ? ["Time left in this block", `${formatClock(remaining)} left`]
        : ["Time left in this block", `${formatClock(-remaining)} over`];
  return (
    <p
      role="timer"
      aria-label={label}
      className={`font-mono text-sm tabular-nums ${remaining !== null && remaining < 0 ? "text-amber-700 dark:text-amber-400" : ""}`}
    >
      {reading}
    </p>
  );
}
