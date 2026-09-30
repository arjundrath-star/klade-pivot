import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { z } from "zod";
import { ProblemCard } from "./problem-card";
import { SessionComplete } from "./session-complete";
import { SessionRunner } from "./session-runner";
import { WorkedExample } from "./worked-example";
import { exampleFor } from "@/coach/example";
import { isCoachedBlock, problemKey, type AnsweredBlockId, type BlockId } from "@/session/blocks";
import { DEMO_STUDENT_ID } from "@/db/demo";
import { loadSession } from "@/session/load";
import { renderSessionProblem } from "@/session/problems";
import { timeInBlock } from "@/session/timer";

function StubPanel({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-lg border border-dashed border-zinc-300 p-5 text-zinc-600 dark:border-zinc-700 dark:text-zinc-400">
      {children}
    </p>
  );
}

export default async function SessionPage({ params }: PageProps<"/student/session/[id]">) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();

  // Sign-in is not built yet, so the page acts as the demo student.
  const loaded = await loadSession(id, DEMO_STUDENT_ID);
  if (!loaded) notFound();
  const { session, content, problems, counts, progress, coach } = loaded;
  if (session.status === "done") return <SessionComplete title={session.title} />;
  if (session.status !== "in_progress") notFound();

  // Problems render on the server so the answers never reach the browser. The coach's worked
  // example is a different instance, so its numbers can.
  const problemPanel = (block: AnsweredBlockId) => (
    <div className="flex flex-col gap-4">
      {problems
        .filter((p) => p.block === block)
        .map((p) => {
          const rendered = renderSessionProblem(p, session.interests);
          const key = problemKey(block, p.index);
          return (
            <ProblemCard
              key={p.index}
              sessionId={session.id}
              block={block}
              index={p.index}
              text={rendered.text}
              equation={rendered.kind === "symbolic" ? rendered.equation : undefined}
              coach={
                isCoachedBlock(block) && !progress.solved.has(key)
                  ? {
                      example: exampleFor(p, session.interests),
                      initialTurns: coach.turns.get(key) ?? [],
                    }
                  : undefined
              }
            />
          );
        })}
    </div>
  );

  const { learn } = content;

  const panels: Record<BlockId, ReactNode> = {
    warmup: problemPanel("warmup"),
    learn: (
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-3 leading-relaxed">
          {learn.explanation.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
        <WorkedExample
          sessionId={session.id}
          equation={learn.example.equation}
          steps={learn.example.steps}
        />
      </div>
    ),
    guided: problemPanel("guided"),
    explain: <StubPanel>Explain-back is not built yet.</StubPanel>,
    exit: <StubPanel>The exit check is not built yet.</StubPanel>,
  };

  return (
    <SessionRunner
      // A server refresh after the session moved elsewhere remounts the runner with fresh state.
      key={`${session.currentBlock}:${session.blockStartedAt?.getTime()}`}
      sessionId={session.id}
      title={session.title}
      initialBlock={session.currentBlock}
      initialElapsedMs={timeInBlock(
        session.blockElapsedMs,
        session.currentBlock,
        session.blockStartedAt,
      )}
      timerMode={session.timerMode}
      counts={counts}
      initialSolved={[...progress.solved]}
      initialLessonRead={progress.lessonRead}
      panels={panels}
    />
  );
}
