import { expect, type Page } from "@playwright/test";
import { answersFor, recordPass } from "../helpers/answers";
import { DEMO_MASTERED_KEYS, STREAK_REWARD_WEEKS } from "@/db/demo";
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
 * Where the 4-week streak reward stands before today's session: the seed puts it one session
 * short, which reads one week short on a Monday (today starts a new calendar week) and at the
 * target, waiting on the session, on any other day.
 */
export function streakRewardBeforeToday(): number {
  return weekdayOf(calendarDay(new Date())) === "mon"
    ? STREAK_REWARD_WEEKS - 1
    : STREAK_REWARD_WEEKS;
}

/** The session page is on the block headed `label`, at `position` on the progress bar. */
export async function expectBlock(page: Page, label: string, position: number) {
  await expect(page.getByRole("heading", { level: 1, name: label })).toBeVisible();
  await expect(page.getByRole("progressbar")).toHaveAttribute("aria-valuenow", String(position));
}

/** The workspace strip says this is problem `index` (1-based) of `count`. */
export async function expectProblem(page: Page, index: number, count: number) {
  await expect(page.getByText(`Problem ${index} of ${count}`)).toBeVisible();
}

/** Presses Start on the student's page and returns the new session's id from its URL. */
export async function startSession(page: Page): Promise<string> {
  await page.getByRole("button", { name: "Start" }).click();
  await expect(page).toHaveURL(/\/student\/session\/[0-9a-f-]{36}$/);
  return page.url().split("/").pop() ?? "";
}

/** Confirms the chapter as read, which is all the learn block's gate asks. */
export async function readLesson(page: Page) {
  await page.getByRole("button", { name: "I've read this" }).click();
}

/** Answers the problem on the desk correctly. */
export async function solveShown(page: Page, answer: number) {
  const problem = page.getByRole("article", { name: "Problem" });
  await problem.getByLabel("Your answer").fill(String(answer));
  await problem.getByRole("button", { name: "Check" }).click();
  await expect(problem.getByText("Correct.")).toBeVisible();
}

/**
 * Answers the block's problems from `from` up to `to` (0-based, exclusive) correctly, one at a
 * time, pressing Next problem after each one that has a problem after it, and checks the counter
 * names the problem left on the desk.
 */
async function solveProblems(
  page: Page,
  sessionId: string,
  block: AnsweredBlockId,
  from: number,
  to: number,
) {
  const answers = await answersFor(sessionId, block);
  const last = answers.length - 1;
  for (let i = from; i < Math.min(to, answers.length); i += 1) {
    await expectProblem(page, i + 1, answers.length);
    await solveShown(page, answers[i]);
    if (i < last) await page.getByRole("button", { name: "Next problem" }).click();
  }
  await expectProblem(page, Math.min(to, last) + 1, answers.length);
}

/** Solves every problem in the block from problem `from`; the block's own Next is the caller's. */
export async function solveBlock(page: Page, sessionId: string, block: AnsweredBlockId, from = 0) {
  await solveProblems(page, sessionId, block, from, Number.MAX_SAFE_INTEGER);
}

/** Solves the problems before `index` in the block, so that problem is the one on the desk. */
export async function openProblem(
  page: Page,
  sessionId: string,
  block: AnsweredBlockId,
  index: number,
) {
  await solveProblems(page, sessionId, block, 0, index);
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
    await expectProblem(page, i + 1, 3);
    const card = page.getByRole("article", { name: "Problem" });
    await expect(card.getByRole("button", { name: "I'm stuck" })).toHaveCount(0);
    await card.getByLabel("Your answer").fill(String(right ? answers[i] : answers[i] + 1));
    await card.getByRole("button", { name: "Submit" }).click();
  }
  await expect(page.getByText("You answered all 3 problems.")).toBeVisible();
}
