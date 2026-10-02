"use client";

import dynamic from "next/dynamic";
import { useId, useState, type KeyboardEvent, type ReactNode, type RefObject } from "react";
import type { ChapterNodes } from "./chapter-reader";
import { NotesPanel } from "./notes-panel";
import { Button } from "@/components/ui/button";

// The pad's code loads the first time the stylus tab opens, so it stays out of the route's first load.
const StylusPad = dynamic(() => import("./stylus-pad").then((m) => m.StylusPad), {
  ssr: false,
  loading: () => <p className="text-sm text-ink-soft">Getting the page ready…</p>,
});

const TABS = ["notes", "stylus", "reference"] as const;

type Tab = (typeof TABS)[number];

const TAB_LABELS: Readonly<Record<Tab, string>> = {
  notes: "Notes",
  stylus: "Write with a stylus",
  reference: "Key learnings",
};

interface NotebookProps {
  sessionId: string;
  initialNotes: string;
  /** Set by the notes panel: saves what it holds, for the runner to await before a block move. */
  flushNotes: RefObject<() => Promise<void>>;
  /** The chapter beside the problem, in blocks that allow it. */
  reference?: ChapterNodes;
}

/**
 * The student's notebook at the side of the desk: their notes, the stylus prototype, and in
 * guided practice the chapter's key learnings and the chapter itself, all without leaving the
 * problem. Every tab stays mounted, so switching back loses nothing.
 */
export function Notebook({ sessionId, initialNotes, flushNotes, reference }: NotebookProps) {
  const id = useId();
  const [picked, setPicked] = useState<Tab>("notes");
  const [stylusOpened, setStylusOpened] = useState(false);
  const [chapterOpen, setChapterOpen] = useState(false);
  const tabs: readonly Tab[] = reference ? TABS : TABS.filter((tab) => tab !== "reference");
  const tab = tabs.includes(picked) ? picked : "notes";

  const pick = (next: Tab) => {
    setPicked(next);
    if (next === "stylus") setStylusOpened(true);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const at = tabs.indexOf(tab);
    const moves: Record<string, number> = {
      ArrowRight: at + 1,
      ArrowLeft: at - 1 + tabs.length,
      Home: 0,
      End: tabs.length - 1,
    };
    if (!(event.key in moves)) return;
    event.preventDefault();
    const to = tabs[moves[event.key] % tabs.length];
    pick(to);
    document.getElementById(`${id}-tab-${to}`)?.focus();
  };

  const panel = (name: Tab, children: ReactNode) => (
    <div
      role="tabpanel"
      id={`${id}-panel-${name}`}
      aria-labelledby={`${id}-tab-${name}`}
      hidden={tab !== name}
      className="min-h-0 overflow-y-auto p-4"
    >
      {children}
    </div>
  );

  return (
    <aside
      aria-label="Notebook"
      className="flex min-w-0 flex-col lg:sticky lg:top-4 lg:max-h-[calc(100dvh-2rem)] lg:self-start"
    >
      <div role="tablist" aria-label="Notebook" className="flex flex-wrap gap-1 px-1">
        {tabs.map((name) => {
          const selected = name === tab;
          return (
            <button
              key={name}
              type="button"
              role="tab"
              id={`${id}-tab-${name}`}
              aria-selected={selected}
              aria-controls={`${id}-panel-${name}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => pick(name)}
              onKeyDown={onKeyDown}
              className={`focus-ring min-h-9 rounded-t-md px-3 text-sm font-medium transition-colors ${
                selected ? "bg-well text-ink" : "text-ink-soft hover:bg-well/60 hover:text-ink"
              }`}
            >
              {TAB_LABELS[name]}
            </button>
          );
        })}
      </div>
      <div className="flex min-h-0 flex-col rounded-lg bg-well">
        {panel(
          "notes",
          <NotesPanel sessionId={sessionId} initialNotes={initialNotes} flushRef={flushNotes} />,
        )}
        {panel("stylus", stylusOpened && <StylusPad />)}
        {reference &&
          panel(
            "reference",
            chapterOpen ? (
              <div className="flex flex-col gap-5">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setChapterOpen(false)}
                  className="self-start"
                >
                  Back to key learnings
                </Button>
                <h2 className="font-display text-lg font-semibold tracking-tight">
                  {reference.title}
                </h2>
                {reference.contents}
                {reference.sections}
              </div>
            ) : (
              <div className="flex flex-col gap-5">
                {reference.keyLearnings}
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setChapterOpen(true)}
                  className="self-start"
                >
                  Open the chapter
                </Button>
              </div>
            ),
          )}
      </div>
    </aside>
  );
}
