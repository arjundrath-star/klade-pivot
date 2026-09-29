import type { WorkedExample } from "@/content/lesson";
import type { ValidTemplate } from "@/engine/types";

/** One session's curriculum, hand-written and graded deterministically. */
export interface SessionContent {
  /** Prerequisite problems that open the session. */
  warmup: readonly ValidTemplate[];
  learn: {
    /** Plain-language concept explanation, one paragraph per entry. */
    explanation: readonly string[];
    /** The worked example, the same for every student. */
    example: WorkedExample;
  };
  guided: readonly ValidTemplate[];
  /** Must not share a template with `guided`. */
  exit: readonly ValidTemplate[];
}
