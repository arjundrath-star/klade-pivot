import { readFileSync } from "node:fs";
import { watchConsole } from "./console";
import { expect, test } from "./fixtures";
import {
  answerExitCheck,
  expectBlock,
  expectProblem,
  passExplainBack,
  readLesson,
  sessionXp,
  solveShown,
  startSession,
} from "./flow";
import { demoProblemRows, RUNBOOK_PATH } from "@/admin/runbook";

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

  test("the demo driver hides the ribbon and runs the runbook's problems without a skip", async ({
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

    // After the reset, Start opens the session the runbook's table lists: two problems in each
    // practice block, every one answered.
    const sessionId = await startSession(page);
    const problem = page.getByRole("article", { name: "Problem" });
    const nextProblem = page.getByRole("button", { name: "Next problem" });
    const next = page.getByRole("button", { name: "Next" });
    const answerRows = async (rows: readonly string[][]) => {
      for (const [i, row] of rows.entries()) {
        await expectProblem(page, i + 1, rows.length);
        await expect(problem).toContainText(row[2]);
        // A word problem shows its text; a symbolic one its equation.
        if (row[2] === "Solve for x.") await expect(problem).toContainText(row[3]);
        await solveShown(page, answerOf(row));
        if (i < rows.length - 1) await nextProblem.click();
      }
    };

    // Warm-up: the skip stays for a recording that needs it; the rehearsed route answers.
    await expectBlock(page, "Warm-up", 1);
    await expect(problem.getByRole("button", { name: "Skip (demo)" })).toBeVisible();
    const warmup = tableRows("Warm-up");
    expect(warmup).toHaveLength(2);
    await answerRows(warmup);
    await next.click();

    // Learn: the confirmation alone opens the gate, with no example revealed.
    await expectBlock(page, "Learn", 2);
    await expect(
      page.getByRole("list", { name: "Steps" }).first().getByRole("listitem"),
    ).toHaveCount(0);
    await readLesson(page);
    await next.click();

    // Guided: the soccer juggling problem first; a wrong answer opens the coach.
    await expectBlock(page, "Guided practice", 3);
    const guided = tableRows("Guided practice");
    expect(guided.map((row) => row[2] === "Solve for x.")).toEqual([false, true]);
    await expect(problem).toContainText(guided[0][2]);
    await problem.getByLabel("Your answer").fill(String(answerOf(guided[0]) + 1));
    await problem.getByRole("button", { name: "Check" }).click();
    await expect(problem.getByText("Not quite. Try again.")).toBeVisible();
    const coach = problem.getByRole("complementary", { name: "Coach" });
    await expect(coach.getByRole("alert")).toHaveText(/Your coach is offline right now/);
    await answerRows(guided);
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

    // Every problem solved: the full XP for the session she ran.
    await expect(page.getByRole("heading", { level: 1, name: "Mastered" })).toBeVisible();
    await expect(
      page.getByRole("region", { name: "This session" }).getByText(`+${sessionXp(2)} XP`),
    ).toBeVisible();

    // The parent's history has nothing to mark.
    await page.goto("/parent");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByText(/skipped \(demo\)/)).toHaveCount(0);
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
