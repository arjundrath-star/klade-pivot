import type { ValidTemplate } from "@/engine/types";

/** One session's curriculum, hand-written and graded deterministically. */
export interface SessionContent {
  /** Prerequisite problems that open the session. */
  warmup: readonly ValidTemplate[];
  learn: {
    /** Plain-language concept explanation, one paragraph per entry. */
    explanation: readonly string[];
    /** The worked example. A fixed seed keeps it identical for every student. */
    example: { template: ValidTemplate; seed: number };
  };
  guided: readonly ValidTemplate[];
  /** Must not share a template with `guided`. */
  exit: readonly ValidTemplate[];
}
