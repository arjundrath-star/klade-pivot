import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, expect, vi } from "vitest";
import { submitAnswer } from "@/app/student/session/[id]/actions";
import { seedDemo } from "@/db/demo";
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
