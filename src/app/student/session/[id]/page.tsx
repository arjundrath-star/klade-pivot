import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { z } from "zod";
import { ExplainBack } from "./explain-back";
import { ProblemCard } from "./problem-card";
import { SessionComplete } from "./session-complete";
import { SessionRunner } from "./session-runner";
import { WorkedExample } from "./worked-example";
import { exampleFor } from "@/coach/example";
import { coachContext } from "@/coach/prompt";
import {
  isBlockComplete,
  isCoachedBlock,
  problemKey,
  type AnsweredBlockId,
  type BlockId,
} from "@/session/blocks";
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
  const { session, content, problems, counts, progress, coach, explain } = loaded;
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
  // Block 4 shows a solved problem and its answer, so it renders only once guided practice is
  // finished. Until then its panel is never on screen and must not carry an answer.
  const explained = isBlockComplete("guided", counts, progress)
    ? coachContext(explain.problem, session.interests)
    : undefined;

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
    explain: explained ? (
      <div className="flex flex-col gap-6">
        <article className="flex flex-col gap-3 rounded-lg border border-zinc-200 p-5 dark:border-zinc-800">
          <p className="leading-relaxed">{explained.problem.text}</p>
          {explained.problem.kind === "symbolic" && (
            <p className="font-mono text-xl">{explained.problem.equation}</p>
          )}
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            You solved it:{" "}
            <span className="font-mono">{explained.steps.at(-1)?.equationAfter}</span>
          </p>
        </article>
        <ExplainBack sessionId={session.id} initialResults={explain.results} />
      </div>
    ) : (
      // Seen only while the runner refreshes on its way in from guided practice.
      <p className="text-sm text-zinc-600 dark:text-zinc-400">Getting ready…</p>
    ),
    exit: <StubPanel>The exit check is not built yet.</StubPanel>,
  };

  return (
    <SessionRunner
      // A server refresh after the session moved elsewhere remounts the runner with fresh state.
      // The explain-back status is in the key too, so a result another tab recorded shows up.
      key={`${session.currentBlock}:${session.blockStartedAt?.getTime()}:${progress.explainBack}`}
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
      initialExplainBack={progress.explainBack}
      panels={panels}
    />
  );
}
