import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { z } from "zod";
import { Equation } from "./equation";
import { ExitAnswer } from "./exit-check";
import { ExplainBack } from "./explain-back";
import { ProblemCard } from "./problem-card";
import { SessionComplete } from "./session-complete";
import { SessionRunner } from "./session-runner";
import { WorkedExample } from "./worked-example";
import { adminControls } from "@/admin/controls";
import { AdminRibbon } from "@/admin/ribbon";
import { coachConfigured } from "@/coach/client";
import { exampleFor } from "@/coach/example";
import { coachContext } from "@/coach/prompt";
import { cardClass } from "@/components/ui/card";
import { CourseBreadcrumb } from "@/course/breadcrumb";
import {
  isBlockComplete,
  isCoachedBlock,
  problemKey,
  type AnsweredBlockId,
  type BlockId,
} from "@/session/blocks";
import { markExitShown } from "@/db/queries/exit";
import { sessionSummary } from "@/session/complete";
import { currentStudentId } from "@/session/current-student";
import { loadSession, type LoadedSession } from "@/session/load";
import { findProblem, renderSessionProblem } from "@/session/problems";
import { sessionRewards } from "@/session/rewards";
import { exitProblemSeconds, exitRemainingMs, formatClock, timeInBlock } from "@/session/timer";

// Seen only while the runner refreshes on its way into block 4 or 5.
const gettingReady = <p className="text-sm text-ink-soft">Getting ready…</p>;

/**
 * Block 5: the next unanswered exit-check problem, one at a time. Rendering a problem starts its
 * clock, so this runs only once the student is in the block, and the deadline runs from the first
 * time the server sent the problem: a reload shows the time left, not a fresh clock.
 */
async function exitPanel({ session, problems, counts, progress }: LoadedSession) {
  if (session.currentBlock !== "exit" || !isBlockComplete("explain", counts, progress)) {
    return gettingReady;
  }
  const problem = findProblem(problems, "exit", progress.exitAnswered);
  if (!problem) {
    return <p>You answered all {counts.exit} problems. Press Finish to see how you did.</p>;
  }
  const shownAt = await markExitShown(session.id, problem.index);
  const limitSeconds = exitProblemSeconds(session.timerMode);
  const remainingMs = exitRemainingMs(Date.now() - shownAt.getTime(), session.timerMode);
  const rendered = renderSessionProblem(problem, session.interests);
  return (
    <div className="flex flex-col gap-4">
      <p className="text-ink-soft">
        One try per problem, no coach, no hints.{" "}
        {limitSeconds === null
          ? "Take the time you need."
          : `${formatClock(limitSeconds)} for each problem.`}
      </p>
      <article className={`${cardClass()} flex flex-col gap-4`}>
        <p className="text-sm font-semibold text-ink-soft">
          Problem {problem.index + 1} of {counts.exit}
        </p>
        <p className="text-lg leading-relaxed">{rendered.text}</p>
        {rendered.kind === "symbolic" && <Equation>{rendered.equation}</Equation>}
        <ExitAnswer
          key={problem.index}
          sessionId={session.id}
          index={problem.index}
          remainingMs={remainingMs}
        />
      </article>
    </div>
  );
}

export default async function SessionPage({
  params,
  searchParams,
}: PageProps<"/student/session/[id]">) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();

  const [loaded, controls, { notice }] = await Promise.all([
    loadSession(id, await currentStudentId()),
    adminControls(),
    searchParams,
  ]);
  if (!loaded) notFound();
  const { session, content, problems, counts, progress, coach, explain } = loaded;
  const frame = (body: ReactNode) => (
    <div className="flex flex-col gap-6">
      <AdminRibbon controls={controls} back={`/student/session/${id}`} notice={notice} />
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
        <CourseBreadcrumb contentKey={session.contentKey} />
        {body}
      </div>
    </div>
  );
  if (session.status === "done") {
    const { outcome, completedAt } = session;
    const summary =
      outcome && completedAt
        ? sessionSummary(loaded, outcome, await sessionRewards(session, completedAt))
        : undefined;
    return frame(<SessionComplete title={session.title} summary={summary} />);
  }
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
                      available: coachConfigured(),
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
        <div className="flex flex-col gap-3 text-lg leading-relaxed">
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
        <article className={`${cardClass()} flex flex-col gap-3`}>
          <p className="text-lg leading-relaxed">{explained.problem.text}</p>
          {explained.problem.kind === "symbolic" && (
            <Equation>{explained.problem.equation}</Equation>
          )}
          <p className="text-ink-soft">
            You solved it:{" "}
            <Equation size="inline">{explained.steps.at(-1)?.equationAfter}</Equation>
          </p>
        </article>
        <ExplainBack sessionId={session.id} initialResults={explain.results} />
      </div>
    ) : (
      gettingReady
    ),
    exit: await exitPanel(loaded),
  };

  return frame(
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
      exitAnswered={progress.exitAnswered}
      panels={panels}
    />,
  );
}
