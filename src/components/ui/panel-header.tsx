import type { ReactNode } from "react";

interface PanelHeaderProps {
  /** The heading's id, which the panel's `aria-labelledby` points at. */
  id: string;
  title: ReactNode;
  size?: "md" | "lg";
  /** A figure or a badge on the heading's line. */
  aside?: ReactNode;
  /** One or two sentences under the heading. */
  children?: ReactNode;
}

const SIZES = { md: "text-xl", lg: "text-2xl" } as const;

/** A panel's heading with its aside and its description, the same on every card. */
export function PanelHeader({ id, title, size = "md", aside, children }: PanelHeaderProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 id={id} className={`font-display font-semibold tracking-tight ${SIZES[size]}`}>
          {title}
        </h2>
        {aside}
      </div>
      {children && <div className="flex flex-col gap-1 text-sm text-ink-soft">{children}</div>}
    </div>
  );
}
