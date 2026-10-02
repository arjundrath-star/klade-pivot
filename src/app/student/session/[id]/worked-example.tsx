"use client";

import { useState } from "react";
import { Equation } from "./equation";
import { useProgress } from "./session-runner";
import { StepList } from "./step-list";
import { Button } from "@/components/ui/button";
import type { WorkedExample as Example } from "@/content/lesson";

/** A chapter's worked example, revealed one step per click; all at once once the lesson is read. */
export function WorkedExample({ example }: { example: Example }) {
  const { lessonRead } = useProgress();
  const { steps } = example;
  const [revealed, setRevealed] = useState(lessonRead ? steps.length : 0);
  const allRevealed = revealed === steps.length;

  return (
    <div className="flex flex-col gap-4 border-l-[3px] border-course pl-4">
      {example.kind === "word" && <p className="leading-relaxed">{example.text}</p>}
      <Equation>{example.equation}</Equation>
      <StepList label="Steps" live steps={steps.slice(0, revealed)} />
      {!allRevealed && (
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setRevealed(revealed + 1)}
          className="self-start"
        >
          {revealed === 0 ? "Show the first step" : "Show the next step"}
        </Button>
      )}
    </div>
  );
}
