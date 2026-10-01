"use client";

import dynamic from "next/dynamic";

// The answer form and countdown load when block 5 first renders, so they stay out of the route's
// first load.
export const loadExitPanel = () => import("./exit-panel");

export const ExitAnswer = dynamic(() => loadExitPanel().then((m) => m.ExitPanel), {
  ssr: false,
  loading: () => <p className="text-sm text-zinc-600 dark:text-zinc-400">Getting ready…</p>,
});
