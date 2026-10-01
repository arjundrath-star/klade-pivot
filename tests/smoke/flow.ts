import { expect, type Page } from "@playwright/test";
import { answersFor } from "../helpers/answers";
import type { AnsweredBlockId } from "@/session/blocks";

/** The session page is on the block headed `label`, at `position` on the progress bar. */
export async function expectBlock(page: Page, label: string, position: number) {
  await expect(page.getByRole("heading", { level: 2, name: label })).toBeVisible();
  await expect(page.getByRole("progressbar")).toHaveAttribute("aria-valuenow", String(position));
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
