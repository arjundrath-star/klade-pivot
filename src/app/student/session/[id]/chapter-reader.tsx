import { ConfirmRead } from "./confirm-read";
import type { ReactNode } from "react";

/** The chapter's parts, rendered once on the server, for the runner to place. */
export interface ChapterNodes {
  title: string;
  contents: ReactNode;
  sections: ReactNode;
  keyLearnings: ReactNode;
}

/**
 * The learn block: the chapter with its contents beside it, and the gate at the end, which opens
 * on the student's confirmation alone. The worked examples' stepped reveal is a reading aid.
 */
export function ChapterReader({
  sessionId,
  chapter,
}: {
  sessionId: string;
  chapter: ChapterNodes;
}) {
  return (
    <div className="flex flex-col gap-6 xl:grid xl:grid-cols-[12rem_minmax(0,1fr)] xl:items-start xl:gap-10">
      <div className="xl:sticky xl:top-[calc(var(--strip)+0.5rem)]">{chapter.contents}</div>
      <article className="flex max-w-prose flex-col gap-8">
        <h2 className="font-display text-xl font-semibold tracking-tight">{chapter.title}</h2>
        {chapter.sections}
        <ConfirmRead sessionId={sessionId} />
      </article>
    </div>
  );
}
