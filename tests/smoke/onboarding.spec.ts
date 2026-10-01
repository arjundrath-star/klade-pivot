import { test, expect } from "@playwright/test";
import { watchConsole } from "./console";
import { expectBlock, solveBlock } from "./flow";
import { renderedFor } from "../helpers/answers";
import { addDays } from "@/engine/pace";
import { calendarDay } from "@/parent/progress";

test("a parent onboards a new student, whose first session is framed in their interests", async ({
  page,
}) => {
  const errors = watchConsole(page);
  const next = page.getByRole("button", { name: "Next" });
  const started = Date.now();
  await page.goto("/onboarding");

  await page.getByLabel("Your first name").fill("Sam");
  await next.click();

  await expect(page.getByRole("heading", { name: "Your child" })).toBeFocused();
  await page.getByLabel("Your child's first name").fill("Ava");
  await page.getByLabel("Grade").selectOption("7");
  await expect(page.getByLabel("Pronoun")).toHaveValue("they");
  await next.click();

  // AC 2: next May is 34 whole weeks from Oct 1, which needs 4 a week. The test sets a target 34
  // weeks from whatever today is, so it holds on any day (the exact dates are unit-tested).
  await page.getByLabel("Finish Algebra 1 by").fill(addDays(calendarDay(new Date()), 34 * 7 - 1));
  await page.getByRole("radio", { name: /On track: 4 a week/ }).check();
  const plan = page.getByRole("region", { name: "Your plan" });
  await expect(plan).toContainText("4 sessions a week, 2 hours a week");
  await expect(plan).toContainText("Linear equations in one variable");
  for (const day of ["Mon", "Tue", "Thu", "Sun"]) {
    await expect(page.getByRole("checkbox", { name: day })).toBeChecked();
  }
  for (const day of ["Wed", "Fri", "Sat"]) {
    await expect(page.getByRole("checkbox", { name: day })).not.toBeChecked();
  }
  await expect(page.getByLabel("Session starts at")).toHaveValue("17:00");
  // Standard pace cannot finish by May, so the plan says so and Next waits.
  await page.getByRole("radio", { name: /Standard: 3 a week/ }).check();
  await expect(plan).toContainText("finishes after your date");
  await expect(next).toBeDisabled();
  await page.getByRole("radio", { name: /On track: 4 a week/ }).check();
  await next.click();

  await page.getByRole("radio", { name: "Yes, time and a half (1.5x)" }).check();
  await next.click();

  await page.getByRole("checkbox", { name: "Gaming" }).check();
  await page.getByRole("checkbox", { name: "Animals" }).check();
  await expect(page.getByRole("checkbox", { name: "Music" })).toBeDisabled();
  await page.getByLabel("Favorite in animals (optional)").selectOption("Dogs");
  await page.getByRole("button", { name: "Finish setup" }).click();

  await expect(page).toHaveURL(/\/student$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Hi, Ava");
  // AC 1: the whole setup takes well under a minute; the automation does it in under 20 s.
  expect(Date.now() - started).toBeLessThan(20_000);

  await expect(page.getByText("Two-step equations", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Start" }).click();
  await expect(page).toHaveURL(/\/student\/session\/[0-9a-f-]{36}$/);
  const sessionId = page.url().split("/").pop() ?? "";

  await expectBlock(page, "Warm-up", 1);
  await solveBlock(page, sessionId, "warmup");
  await next.click();
  await expectBlock(page, "Learn", 2);
  const steps = page.getByRole("list", { name: "Steps" }).getByRole("listitem");
  await page.getByRole("button", { name: "Show the first step" }).click();
  const more = page.getByRole("button", { name: "Show the next step" });
  while (await more.isVisible()) {
    const shown = await steps.count();
    await more.click();
    await expect(steps).toHaveCount(shown + 1);
  }
  await page.getByRole("button", { name: "I've read this" }).click();
  await next.click();
  await expectBlock(page, "Guided practice", 3);

  // The first word problem is framed in gaming or animals, the way the server renders it for Ava.
  const guided = await renderedFor(sessionId, "guided");
  const word = guided.findIndex((problem) => problem.kind === "word");
  const first = guided[word];
  expect(first.kind === "word" && first.variant).toMatch(/^(gaming|animals)$/);
  await expect(page.getByRole("article").nth(word)).toContainText(first.text);
  expect(errors).toEqual([]);
});
