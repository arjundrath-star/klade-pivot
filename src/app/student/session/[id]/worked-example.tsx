"use client";

import { useState } from "react";
import { useReveal } from "./chapter-reader";
import { Equation } from "./equation";
import { useProgress } from "./session-runner";
import { StepList } from "./step-list";
import { Button } from "@/components/ui/button";
import type { WorkedExample as Example } from "@/content/lesson";

/**
 * A chapter's worked example, revealed one step per click; all at once once the lesson is read.
 * In the reader, reaching the last step counts toward the gate at the end of the chapter.
 */
export function WorkedExample({ example }: { example: Example }) {
  const { lessonRead } = useProgress();
  const reveal = useReveal();
  const { steps } = example;
  const [revealed, setRevealed] = useState(lessonRead ? steps.length : 0);
  const allRevealed = revealed === steps.length;

  const showNext = () => {
    const next = revealed + 1;
    setRevealed(next);
    if (next === steps.length) reveal?.markRevealed(example.equation);
  };

  return (
    <div className="flex flex-col gap-4 border-l-[3px] border-course pl-4">
      {example.kind === "word" && <p className="leading-relaxed">{example.text}</p>}
      <Equation>{example.equation}</Equation>
      <StepList label="Steps" live steps={steps.slice(0, revealed)} />
      {!allRevealed && (
        <Button variant="secondary" size="sm" onClick={showNext} className="self-start">
          {revealed === 0 ? "Show the first step" : "Show the next step"}
        </Button>
      )}
    </div>
  );
}
