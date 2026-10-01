import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, expect, vi } from "vitest";
import { submitAnswer, submitExitAnswer } from "@/app/student/session/[id]/actions";
import { seedDemo } from "@/db/demo";
import { markExitShown } from "@/db/queries/exit";
import type { AnsweredBlockId } from "@/session/blocks";
import { answersFor } from "./answers";

/**
 * Gives the test file its own libSQL file, migrated from drizzle/ on first connection and seeded
 * with the demo family, and removes it afterwards. Vitest only: the smoke tests use `answers.ts`.
 */
export function withTempDatabase(prefix: string, seededAt: Date): void {
  const dir = mkdtempSync(path.join(tmpdir(), prefix));
  beforeAll(async () => {
    vi.stubEnv("DATABASE_URL", `file:${path.join(dir, "test.db")}`);
    await seedDemo(seededAt);
  });
  afterAll(() => {
    vi.unstubAllEnvs();
    rmSync(dir, { recursive: true, force: true });
  });
}

/** Answers the problems at `indexes` in `block` correctly. */
export async function solve(
  sessionId: string,
  block: AnsweredBlockId,
  indexes: readonly number[],
): Promise<void> {
  const answers = await answersFor(sessionId, block);
  for (const index of indexes) {
    const answer = String(answers[index]);
    expect(await submitAnswer({ sessionId, block, index, answer, timeMs: 1000 })).toEqual({
      ok: true,
      verdict: "correct",
    });
  }
}

/**
 * Shows each exit-check problem in turn, as the page does, and answers it right where `correct` is
 * true and wrong where it is false.
 */
export async function answerExit(sessionId: string, correct: readonly boolean[]): Promise<void> {
  const answers = await answersFor(sessionId, "exit");
  for (const [index, right] of correct.entries()) {
    await markExitShown(sessionId, index);
    const answer = String(right ? answers[index] : answers[index] + 1);
    expect(await submitExitAnswer({ sessionId, index, answer, expired: false })).toEqual({
      ok: true,
      verdict: "recorded",
    });
  }
}

/** Server actions that end in a redirect throw Next's redirect error; this reads its target. */
export async function redirectOf(action: () => Promise<unknown>): Promise<string> {
  try {
    await action();
  } catch (error) {
    const digest = (error as { digest?: string }).digest ?? "";
    return digest.split(";")[2] ?? digest;
  }
  throw new Error("expected a redirect");
}
