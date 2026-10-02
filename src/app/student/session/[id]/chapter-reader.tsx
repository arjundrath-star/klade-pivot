"use client";

import { createContext, use, useState, type ReactNode } from "react";
import { ConfirmRead } from "./confirm-read";

/** The chapter's parts, rendered once on the server, for the runner to place. */
export interface ChapterNodes {
  title: string;
  contents: ReactNode;
  sections: ReactNode;
  keyLearnings: ReactNode;
  /** How many worked examples the sections hold, each to be revealed before the gate opens. */
  examples: number;
}

interface RevealState {
  /** The equations of the worked examples the student has revealed to the last step. */
  revealed: ReadonlySet<string>;
  markRevealed: (equation: string) => void;
}

const RevealContext = createContext<RevealState | null>(null);

/** What the student has revealed so far; null outside the reader, where nothing is gated. */
export function useReveal(): RevealState | null {
  return use(RevealContext);
}

/**
 * The learn block: the chapter with its contents beside it, and the gate at the end, which opens
 * once every worked example has been stepped through.
 */
export function ChapterReader({
  sessionId,
  chapter,
}: {
  sessionId: string;
  chapter: ChapterNodes;
}) {
  const [revealed, setRevealed] = useState<ReadonlySet<string>>(() => new Set());
  const markRevealed = (equation: string) => setRevealed((prev) => new Set(prev).add(equation));
  return (
    <RevealContext value={{ revealed, markRevealed }}>
      <div className="flex flex-col gap-6 xl:grid xl:grid-cols-[12rem_minmax(0,1fr)] xl:items-start xl:gap-10">
        <div className="xl:sticky xl:top-4">{chapter.contents}</div>
        <article className="flex max-w-prose flex-col gap-8">
          <h2 className="font-display text-xl font-semibold tracking-tight">{chapter.title}</h2>
          {chapter.sections}
          <ConfirmRead sessionId={sessionId} examples={chapter.examples} />
        </article>
      </div>
    </RevealContext>
  );
}
