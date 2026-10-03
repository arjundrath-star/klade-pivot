"use client";

import { useState, type ReactNode } from "react";
import { ribbonCookie } from "./ribbon-cookie";
import { Button } from "@/components/ui/button";

interface RibbonFrameProps {
  /** The browser chose Hide before, as its cookie says. */
  initialHidden: boolean;
  /** The ribbon's controls, rendered on the server. */
  children: ReactNode;
}

/**
 * The admin ribbon's box with its Hide control, or the small pill it folds into. The choice is
 * written to a cookie, so the server renders the same state on the next load.
 */
export function RibbonFrame({ initialHidden, children }: RibbonFrameProps) {
  const [hidden, setHidden] = useState(initialHidden);
  const choose = (next: boolean) => {
    document.cookie = ribbonCookie(next);
    setHidden(next);
  };

  if (hidden) {
    return (
      <Button
        variant="demo"
        size="sm"
        onClick={() => choose(false)}
        aria-label="Show the admin ribbon"
        className="self-start"
      >
        <span className="font-display text-primary-deep">Admin</span>
        <span className="font-medium">Show</span>
      </Button>
    );
  }
  return (
    <div
      role="region"
      aria-label="Admin"
      data-ribbon-open
      className="flex items-start gap-3 rounded-md border border-dashed border-line-strong bg-well px-4 py-2.5 text-sm"
    >
      <div className="flex min-w-0 flex-1 flex-col gap-2">{children}</div>
      <Button variant="demo" size="sm" onClick={() => choose(true)}>
        Hide
      </Button>
    </div>
  );
}
