import { s1 } from "@/content/algebra1/linear-equations/s1";
import { growByRate, twoStep } from "@/content/algebra1/linear-equations/s1-templates";
import type { SessionContent } from "@/content/types";

// Session 1 as the demo student runs it: the same templates and chapter, two problems in each
// practice block so the recorded demo runs every problem without skipping. Guided practice opens
// on the soccer juggling word problem, then the symbolic two-step.

export const s1Demo: SessionContent = {
  warmup: s1.warmup.slice(0, 2),
  learn: s1.learn,
  guided: [growByRate, twoStep],
  exit: s1.exit,
};
