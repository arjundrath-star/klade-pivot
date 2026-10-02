import type { ReactNode } from "react";

interface PageHeaderProps {
  /** An id for the heading, when a section is labelled by it. */
  id?: string;
  title: string;
  /** The lines under the heading. */
  children?: ReactNode;
}

/** A page's heading and the lines under it, the same on every page in the shell. */
export function PageHeader({ id, title, children }: PageHeaderProps) {
  return (
    <header className="flex flex-col gap-1">
      <h1 id={id} className="font-display text-3xl font-bold tracking-tight">
        {title}
      </h1>
      {children && <div className="flex max-w-prose flex-col gap-1 text-ink-soft">{children}</div>}
    </header>
  );
}
