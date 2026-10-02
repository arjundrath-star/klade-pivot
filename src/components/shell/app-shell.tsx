import type { Route } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { NavGlyph, type NavGlyphName } from "./nav-glyphs";
import { TINT_BG, TINT_FILL, TINT_TEXT, type Tint } from "@/components/ui/tints";

export interface NavItem {
  href: Route;
  label: string;
  glyph: NavGlyphName;
  /** The feature's tint, shown when the item is the current page. */
  tint: Tint;
}

interface AppShellProps {
  /** Names the navigation for assistive technology: "Student" or "Parent". */
  label: string;
  items: readonly NavItem[];
  /** The current page's `href`. */
  active: Route;
  /** Who this is for, at the top of the sidebar. */
  identity: { name: string; detail: string };
  children: ReactNode;
}

/**
 * The app's frame: a sidebar on wide screens that becomes a bar along the bottom on phones, and
 * the page beside it. One set of server-rendered links; the layout is CSS alone.
 */
export function AppShell({ label, items, active, identity, children }: AppShellProps) {
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-6 pt-4 pb-28 lg:grid lg:grid-cols-[224px_minmax(0,1fr)] lg:gap-10 lg:pb-12">
      <nav
        aria-label={label}
        className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-white/95 backdrop-blur lg:sticky lg:top-6 lg:self-start lg:border-0 lg:bg-transparent lg:backdrop-blur-none"
      >
        <div className="mb-5 hidden flex-col gap-0.5 rounded-lg border border-line px-4 py-3.5 lg:flex">
          <p className="font-display text-lg leading-tight font-semibold">{identity.name}</p>
          <p className="text-sm text-ink-soft">{identity.detail}</p>
        </div>
        <ul className="mx-auto flex max-w-lg justify-around px-1 py-1.5 lg:max-w-none lg:flex-col lg:gap-1 lg:p-0">
          {items.map((item) => {
            const current = item.href === active;
            return (
              <li key={item.href} className="min-w-0 lg:w-full">
                <Link
                  href={item.href}
                  aria-current={current ? "page" : undefined}
                  className={`focus-ring flex flex-col items-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium lg:flex-row lg:gap-3 lg:px-3 lg:py-2.5 lg:text-base ${
                    current
                      ? `${TINT_BG[item.tint]} ${TINT_TEXT[item.tint]} font-semibold`
                      : "text-ink-soft hover:bg-well hover:text-ink"
                  }`}
                >
                  <span
                    className={`grid size-7 shrink-0 place-items-center rounded-sm lg:size-8 ${
                      current ? TINT_FILL[item.tint] : "bg-well text-ink-soft"
                    }`}
                  >
                    <NavGlyph name={item.glyph} className="size-[18px]" />
                  </span>
                  <span className="truncate">{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <main className="flex min-w-0 flex-col gap-6">{children}</main>
    </div>
  );
}
