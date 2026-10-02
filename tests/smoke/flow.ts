import { expect, type Page } from "@playwright/test";
import { answersFor, recordPass } from "../helpers/answers";
import { DEMO_MASTERED_KEYS } from "@/db/demo";
import { addDays, weekdayOf } from "@/engine/pace";
import { XP_TABLE } from "@/engine/progress";
import { calendarDay } from "@/parent/progress";
import type { AnsweredBlockId } from "@/session/blocks";

/** What the phone panel says while the rule holds the apps. */
export const LOCKED = "Locked. Finish today's 30-minute session to unlock.";

/**
 * A target as far from today as next May is from Oct 1 (34 whole weeks), which needs 4 sessions a
 * week, so a plan check holds on any day the test runs.
 */
export function targetNextMay(): string {
  return addDays(calendarDay(new Date()), 34 * 7 - 1);
}

/** The XP a full session pays: the warm-up, every guided problem, the explain-back and the exit check. */
export function sessionXp(guidedProblems: number): number {
  return XP_TABLE.warmup + XP_TABLE.guided * guidedProblems + XP_TABLE.explain + XP_TABLE.exit;
}

/** The demo persona's record: five sessions of the shipped shape, one per mastered concept. */
export const SEEDED_SESSIONS = DEMO_MASTERED_KEYS.length;

/** Her streak going into the demo day: every seeded session was on its day. */
export const SEEDED_STREAK = SEEDED_SESSIONS;

/**
 * Where the 4-week streak reward stands once today's session is done. Her record spans two
 * calendar weeks on top of one seeded week, so today's session completes the reward only when
 * today starts a new week, a Monday; any other day it stays at 3 of 4.
 */
export function streakRewardAfterToday(): { weeks: number; unlocked: boolean } {
  const unlocked = weekdayOf(calendarDay(new Date())) === "mon";
  return { weeks: unlocked ? 4 : 3, unlocked };
}

/** The session page is on the block headed `label`, at `position` on the progress bar. */
export async function expectBlock(page: Page, label: string, position: number) {
  await expect(page.getByRole("heading", { level: 2, name: label })).toBeVisible();
  await expect(page.getByRole("progressbar")).toHaveAttribute("aria-valuenow", String(position));
}

/** Presses Start on the student's page and returns the new session's id from its URL. */
export async function startSession(page: Page): Promise<string> {
  await page.getByRole("button", { name: "Start" }).click();
  await expect(page).toHaveURL(/\/student\/session\/[0-9a-f-]{36}$/);
  return page.url().split("/").pop() ?? "";
}

/** Reveals the worked example one step at a time, then confirms the lesson was read. */
export async function readLesson(page: Page) {
  const steps = page.getByRole("list", { name: "Steps" }).getByRole("listitem");
  await page.getByRole("button", { name: "Show the first step" }).click();
  const more = page.getByRole("button", { name: "Show the next step" });
  while (await more.isVisible()) {
    const shown = await steps.count();
    await more.click();
    await expect(steps).toHaveCount(shown + 1);
  }
  await page.getByRole("button", { name: "I've read this" }).click();
}

/** Answers every problem in the block correctly, one card at a time. */
export async function solveBlock(page: Page, sessionId: string, block: AnsweredBlockId) {
  const answers = await answersFor(sessionId, block);
  const cards = page.getByRole("article");
  await expect(cards).toHaveCount(answers.length);
  for (const [i, answer] of answers.entries()) {
    await cards.nth(i).getByLabel("Your answer").fill(String(answer));
    await cards.nth(i).getByRole("button", { name: "Check" }).click();
    await expect(cards.nth(i).getByText("Correct.")).toBeVisible();
  }
}

/** From a session's first screen through the warm-up and the lesson to guided practice. */
export async function reachGuidedPractice(page: Page, sessionId: string) {
  const next = page.getByRole("button", { name: "Next" });
  await expectBlock(page, "Warm-up", 1);
  await solveBlock(page, sessionId, "warmup");
  await next.click();
  await expectBlock(page, "Learn", 2);
  await readLesson(page);
  await next.click();
  await expectBlock(page, "Guided practice", 3);
}

/**
 * Submits the explanation and sees the grader report itself unavailable, which is what it does
 * with the API key unset. A graded pass stored the way the grader stores one then stands in for
 * the model, and the page reads it on reload like any stored result.
 */
export async function passExplainBack(page: Page, sessionId: string, text: string) {
  const field = page.getByLabel("Explain why each step works");
  await field.fill(text);
  await page.getByRole("button", { name: "Submit" }).click();
  await expect(page.getByText(/grading unavailable/i)).toBeVisible();
  await expect(field).toHaveValue(text);
  await recordPass(sessionId, text);
  await page.reload();
  await expectBlock(page, "Explain-back", 4);
  await expect(page.getByText(/Passed\./)).toBeVisible();
}

/** Answers the three exit-check problems one at a time, right where `correct` is true. */
export async function answerExitCheck(page: Page, sessionId: string, correct: readonly boolean[]) {
  const answers = await answersFor(sessionId, "exit");
  for (const [i, right] of correct.entries()) {
    const card = page.getByRole("article");
    await expect(card).toContainText(`Problem ${i + 1} of 3`);
    await expect(card.getByRole("button", { name: "I'm stuck" })).toHaveCount(0);
    await card.getByLabel("Your answer").fill(String(right ? answers[i] : answers[i] + 1));
    await card.getByRole("button", { name: "Submit" }).click();
  }
  await expect(page.getByText("You answered all 3 problems.")).toBeVisible();
}
