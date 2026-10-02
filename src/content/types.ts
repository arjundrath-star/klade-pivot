import type { WorkedExample } from "@/content/lesson";
import type { ValidTemplate } from "@/engine/types";

/**
 * A diagram the chapter view draws as inline SVG from these numbers alone. The content names the
 * picture and its values; the app owns the drawing.
 */
export type ChapterDiagram =
  /** A balance scale: a bags of x and b weights on the left pan, c weights on the right. */
  | { kind: "balance"; a: number; b: number; c: number }
  /** A number line with one jump: `from` plus `step`. */
  | { kind: "number-line"; from: number; step: number }
  /** The build-up of ax + b from x, and the two undo moves back down to x. */
  | { kind: "undo-ladder"; a: number; b: number; x: number };

/** The free, reputable sources a chapter may link a video from. */
export type ChapterVideoSource = "Khan Academy" | "Math Antics";

/** A link to a free video, fetched during the build and kept only if it answered 200. */
export interface ChapterVideo {
  title: string;
  source: ChapterVideoSource;
  url: string;
  /** The day (YYYY-MM-DD) the link was fetched and answered with this title. */
  verified: string;
}

/** A slip students make, as the wrong line they write, and how to fix it. */
export interface ChapterMistake {
  wrong: string;
  fix: string;
}

export interface ChapterSection {
  /** Stable, for links into the section. */
  id: string;
  heading: string;
  paragraphs: readonly string[];
  diagram?: ChapterDiagram;
  example?: WorkedExample;
  video?: ChapterVideo;
  mistakes?: readonly ChapterMistake[];
  /** One-line takeaways: the key learnings, shown again beside guided practice. */
  points?: readonly string[];
}

/** A textbook chapter for one concept: sections in reading order. Built by `defineChapter`. */
export interface Chapter {
  title: string;
  sections: readonly ChapterSection[];
  /** The one section's points, five to seven lines, shown again beside guided practice. */
  keyLearnings: readonly string[];
}

/** One session's curriculum, hand-written and graded deterministically. */
export interface SessionContent {
  /** Prerequisite problems that open the session. */
  warmup: readonly ValidTemplate[];
  learn: {
    /**
     * The lesson in a few paragraphs, which the coach reads as "the lesson the student just read"
     * in the cached prefix of its prompt. The student reads the chapter.
     */
    explanation: readonly string[];
    /** The worked example the coach's prompt cites, the first one in the chapter. */
    example: WorkedExample;
    chapter: Chapter;
  };
  guided: readonly ValidTemplate[];
  /** Must not share a template with `guided`. */
  exit: readonly ValidTemplate[];
}
