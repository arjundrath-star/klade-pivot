import { watchConsole } from "./console";
import { expect, test } from "./fixtures";
import {
  answerExitCheck,
  expectBlock,
  expectProblem,
  LOCKED,
  PASSING_EXPLANATION,
  passExplainBack,
  reachGuidedPractice,
  sessionXp,
  solveShown,
  startSession,
} from "./flow";
import { answersFor } from "../helpers/answers";
import type { Page } from "@playwright/test";

/** The starting state a visitor's copy shows on /student: Maya, today waiting, the phone locked. */
async function expectStartingState(page: Page) {
  await expect(page).toHaveURL(/\/student$/);
  await expect(page.getByText(/^Hi, Maya\./)).toBeVisible();
  const todayCard = page.getByRole("region", { name: "Today's session" });
  await expect(todayCard.getByRole("button", { name: "Start today's session" })).toBeVisible();
  await expect(todayCard.getByText("Phone: locked until this session is done.")).toBeVisible();
  await expect(page.getByRole("region", { name: "Your phone" }).getByText(LOCKED)).toBeVisible();
  await expect(page.getByRole("button", { name: "Start the demo over" })).toBeVisible();
  // Nothing of the admin's.
  await expect(page.getByRole("region", { name: "Admin" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Show the admin ribbon" })).toHaveCount(0);
}

// The deck's link, in a browser that has never been here: no gate cookie, no student cookie.
test.describe("the public link", () => {
  test.use({ signedIn: false });
  test.setTimeout(90_000);

  test("gives each browser its own copy of the demo, which runs and starts over on its own", async ({
    page,
    browser,
  }) => {
    const errors = watchConsole(page);
    await page.goto("/student");
    await expectStartingState(page);

    // A second browser at the same time: its own copy, at the same starting state.
    const other = await browser.newContext();
    const otherPage = await other.newPage();
    const otherErrors = watchConsole(otherPage);
    await otherPage.goto("/student");
    await expectStartingState(otherPage);

    // The demo's session: two problems a practice block, no skip, the coach offline on I'm stuck.
    const sessionId = await startSession(page);
    const next = page.getByRole("button", { name: "Next" });
    await expectBlock(page, "Warm-up", 1);
    await expectProblem(page, 1, 2);
    await expect(page.getByRole("button", { name: "Skip (demo)" })).toHaveCount(0);
    await reachGuidedPractice(page, sessionId);
    const problem = page.getByRole("article", { name: "Problem" });
    const offline = problem.getByRole("complementary", { name: "Coach" }).getByRole("alert");
    const [first, second] = await answersFor(sessionId, "guided");
    // A wrong answer on the first problem opens the coach; I'm stuck opens it on the second.
    await expectProblem(page, 1, 2);
    await problem.getByLabel("Your answer").fill(String(first + 1));
    await problem.getByRole("button", { name: "Check" }).click();
    await expect(problem.getByText("Not quite. Try again.")).toBeVisible();
    await expect(offline).toHaveText(/Your coach is offline right now/);
    await solveShown(page, first);
    await page.getByRole("button", { name: "Next problem" }).click();
    await expectProblem(page, 2, 2);
    await problem.getByRole("button", { name: "I'm stuck" }).click();
    await expect(offline).toHaveText(/Your coach is offline right now/);
    await solveShown(page, second);
    await next.click();
    await expectBlock(page, "Explain-back", 4);
    await passExplainBack(page, sessionId, PASSING_EXPLANATION);
    await next.click();
    await expectBlock(page, "Exit check", 5);
    await answerExitCheck(page, sessionId, [true, true, true]);
    await page.getByRole("button", { name: "Finish" }).click();

    // Done: mastered, the session's XP, and the way back to the start on this screen too.
    await expect(page.getByRole("heading", { level: 1, name: "Mastered" })).toBeVisible();
    await expect(
      page.getByRole("region", { name: "This session" }).getByText(`+${sessionXp(2)} XP`),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Start the demo over" })).toBeVisible();
    await page.getByRole("link", { name: "Back to today" }).click();
    await expect(page.getByText("Every built session is done.")).toBeVisible();
    const phone = page.getByRole("region", { name: "Your phone" });
    await expect(phone.getByText("Today's session is done. Everything is open.")).toBeVisible();
    await expect(phone.getByText(LOCKED)).toHaveCount(0);

    // The parent's pages open for this copy without the gate; the admin panel does not.
    await page.goto("/parent");
    await expect(page).toHaveURL(/\/parent$/);
    await expect(page.getByRole("heading", { level: 1, name: "Overview" })).toBeVisible();
    await expect(page.getByText("Mastered", { exact: true }).first()).toBeVisible();
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/gate\?next=%2Fadmin$/);

    // Start over: the starting state again, within the panel's own patience.
    await page.goto("/student");
    await page.getByRole("button", { name: "Start the demo over" }).click();
    await expectStartingState(page);

    // The other browser saw none of it.
    await otherPage.reload();
    await expectStartingState(otherPage);
    await other.close();
    expect(errors).toEqual([]);
    expect(otherErrors).toEqual([]);
  });
});
