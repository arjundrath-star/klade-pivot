"use client";

import dynamic from "next/dynamic";

// The panel's code (text area, microphone, results) loads when block 4 first renders, so it stays
// out of the route's first load.
export const loadExplainPanel = () => import("./explain-panel");

export const ExplainBack = dynamic(() => loadExplainPanel().then((m) => m.ExplainPanel), {
  ssr: false,
  loading: () => <p className="text-sm text-ink-soft">Getting ready…</p>,
});
