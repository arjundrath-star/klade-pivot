import { readFileSync } from "node:fs";
import { watchConsole } from "./console";
import { expect, test } from "./fixtures";
import {
  answerExitCheck,
  expectBlock,
  expectProblem,
  passExplainBack,
  readLesson,
  solveBlock,
  solveShown,
  startSession,
} from "./flow";
import { demoProblemRows, RUNBOOK_PATH } from "@/admin/runbook";
import { XP_TABLE } from "@/engine/progress";

const EXPLANATION =
  "I took the same number away from both sides, then divided both sides, so it stays balanced.";

/** The runbook's "Demo problems" rows for one block: [block, number, text, equation, answer]. */
function tableRows(block: string): string[][] {
  const [, ...rows] = demoProblemRows(readFileSync(RUNBOOK_PATH, "utf8"));
  return rows.filter((row) => row[0] === block);
}

/** "x = 13" as the number a student types. */
function answerOf(row: readonly string[]): number {
  return Number(row[4].replace("x = ", ""));
}

test.describe("signed in at the gate", () => {
  test.setTimeout(90_000);

  test("the demo driver hides the ribbon, skips practice and runs the runbook's problems", async ({
    page,
  }) => {
    const errors = watchConsole(page);
    await page.goto("/student");

    // Hide folds the ribbon into a pill this browser remembers; the pill brings it back.
    const ribbon = page.getByRole("region", { name: "Admin" });
    await ribbon.getByRole("button", { name: "Hide" }).click();
    const pill = page.getByRole("button", { name: "Show the admin ribbon" });
    await expect(pill).toBeVisible();
    await expect(ribbon).toHaveCount(0);
    await page.reload();
    await expect(pill).toBeVisible();
    await expect(ribbon).toHaveCount(0);
    await pill.click();
    await expect(ribbon.getByRole("button", { name: "Reset demo" })).toBeVisible();

    // After the reset, Start opens the session the runbook's table lists.
    const sessionId = await startSession(page);
    const problem = page.getByRole("article", { name: "Problem" });
    const skip = problem.getByRole("button", { name: "Skip (demo)" });
    const skipped = problem.getByText("Skipped for the demo. It earns nothing.");
    const nextProblem = page.getByRole("button", { name: "Next problem" });
    const next = page.getByRole("button", { name: "Next" });

    // Warm-up: two skips, then the third answered.
    await expectBlock(page, "Warm-up", 1);
    const warmup = tableRows("Warm-up");
    for (const [i, row] of warmup.entries()) {
      await expectProblem(page, i + 1, warmup.length);
      await expect(problem).toContainText(row[2]);
      await expect(problem).toContainText(row[3]);
      if (i === warmup.length - 1) break;
      await skip.click();
      await expect(skipped).toBeVisible();
      await expect(problem.getByLabel("Your answer")).toHaveCount(0);
      await nextProblem.click();
    }
    await solveShown(page, answerOf(warmup[warmup.length - 1]));
    await next.click();

    // Learn: the confirmation alone opens the gate, with no example revealed.
    await expectBlock(page, "Learn", 2);
    await expect(
      page.getByRole("list", { name: "Steps" }).first().getByRole("listitem"),
    ).toHaveCount(0);
    await readLesson(page);
    await next.click();

    // Guided: skip to the first word problem, answer it wrong, and the coach opens.
    await expectBlock(page, "Guided practice", 3);
    const guided = tableRows("Guided practice");
    const word = guided.findIndex((row) => row[2] !== "Solve for x.");
    expect(word).toBeGreaterThan(0);
    for (let i = 0; i < word; i += 1) {
      await skip.click();
      await expect(skipped).toBeVisible();
      await nextProblem.click();
    }
    await expect(problem).toContainText(guided[word][2]);
    await problem.getByLabel("Your answer").fill(String(answerOf(guided[word]) + 1));
    await problem.getByRole("button", { name: "Check" }).click();
    await expect(problem.getByText("Not quite. Try again.")).toBeVisible();
    const coach = problem.getByRole("complementary", { name: "Coach" });
    await expect(coach.getByRole("alert")).toHaveText(/Your coach is offline right now/);
    await solveBlock(page, sessionId, "guided", word);
    await next.click();

    // The rest as the runbook says: the explain-back and the exit check have no skip.
    await expectBlock(page, "Explain-back", 4);
    await expect(page.getByRole("button", { name: "Skip (demo)" })).toHaveCount(0);
    await passExplainBack(page, sessionId, EXPLANATION);
    await next.click();
    await expectBlock(page, "Exit check", 5);
    await expect(problem).toContainText(tableRows("Exit check")[0][3]);
    await expect(page.getByRole("button", { name: "Skip (demo)" })).toHaveCount(0);
    await answerExitCheck(page, sessionId, [true, true, true]);
    await page.getByRole("button", { name: "Finish" }).click();

    // Skips earn nothing: no warm-up XP, and guided practice pays for its solved problems only.
    await expect(page.getByRole("heading", { level: 1, name: "Mastered" })).toBeVisible();
    const xp = XP_TABLE.guided * (guided.length - word) + XP_TABLE.explain + XP_TABLE.exit;
    await expect(
      page.getByRole("region", { name: "This session" }).getByText(`+${xp} XP`),
    ).toBeVisible();

    // The parent's history marks the session's skips.
    await page.goto("/parent");
    await expect(page.getByText(`${warmup.length - 1 + word} skipped (demo)`)).toBeVisible();
    expect(errors).toEqual([]);
  });
});

test.describe("not signed in", () => {
  test.use({ signedIn: false });

  test("a student's session has no skip and no ribbon", async ({ page }) => {
    const errors = watchConsole(page);
    await page.goto("/student");
    await expect(page.getByRole("region", { name: "Admin" })).toHaveCount(0);
    await startSession(page);
    await expectBlock(page, "Warm-up", 1);
    await expect(page.getByRole("article", { name: "Problem" })).toContainText(
      tableRows("Warm-up")[0][3],
    );
    await expect(page.getByRole("button", { name: "Skip (demo)" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Show the admin ribbon" })).toHaveCount(0);
    expect(errors).toEqual([]);
  });
});
