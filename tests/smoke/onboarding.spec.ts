import { watchConsole } from "./console";
import { expect, test } from "./fixtures";
import { reachGuidedPractice, startSession, targetNextMay } from "./flow";
import { renderedFor } from "../helpers/answers";

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

  // AC 2: next May is 34 whole weeks from Oct 1, which needs 4 a week (the exact dates are
  // unit-tested).
  await page.getByLabel("Finish Algebra 1 by").fill(targetNextMay());
  await page.getByRole("radio", { name: /On track: 4 a week/ }).check();
  const plan = page.getByRole("region", { name: "Your plan" });
  await expect(plan).toContainText("4 sessions a week, 2 hours a week");
  await expect(plan).toContainText("Numbers, quantities, and expressions");
  for (const day of ["Mon", "Tue", "Thu", "Sun"]) {
    await expect(page.getByRole("checkbox", { name: day, exact: true })).toBeChecked();
  }
  for (const day of ["Wed", "Fri", "Sat"]) {
    await expect(page.getByRole("checkbox", { name: day, exact: true })).not.toBeChecked();
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
  await next.click();

  // The phone rule starts from the plan: its days, its start time, games and social.
  await expect(page.getByRole("heading", { name: "Phone rule" })).toBeFocused();
  for (const day of ["Mon", "Tue", "Thu", "Sun"]) {
    await expect(page.getByRole("checkbox", { name: day, exact: true })).toBeChecked();
  }
  await expect(page.getByLabel("From")).toHaveValue("17:00");
  await expect(page.getByRole("checkbox", { name: "Games" })).toBeChecked();
  await expect(page.getByRole("checkbox", { name: "Social" })).toBeChecked();
  await expect(page.getByRole("checkbox", { name: "Video" })).not.toBeChecked();
  // Skipped: no rule, so no phone on the student's view and nothing between Ava and her session.
  await page.getByRole("button", { name: "Skip for now" }).click();

  await expect(page).toHaveURL(/\/student$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Hi, Ava");
  await expect(page.getByRole("heading", { name: "Your phone" })).toHaveCount(0);
  // AC 1: the whole setup takes well under a minute; the automation does it in under 20 s.
  expect(Date.now() - started).toBeLessThan(20_000);

  // A new student starts on two-step equations too, with the dashboard's empty states.
  await expect(page.getByText("Solving two-step linear equations", { exact: true })).toBeVisible();
  await expect(page.getByText("0 of 49", { exact: true })).toBeVisible();
  await page.goto("/student/progress");
  await expect(page.getByText("No badges yet.")).toBeVisible();
  // The calendar reads her plan: the next session is today or the first of her days to come.
  await page.goto("/student/calendar");
  await expect(page.getByRole("heading", { name: "Next session" })).toBeVisible();
  await expect(page.getByText(/^(Today|\w{3}, \w{3} \d+), 5:00 PM$/)).toBeVisible();
  await page.goto("/student");
  const sessionId = await startSession(page);
  await reachGuidedPractice(page, sessionId);

  // The first word problem is framed in gaming or animals, the way the server renders it for Ava.
  const guided = await renderedFor(sessionId, "guided");
  const word = guided.findIndex((problem) => problem.kind === "word");
  const first = guided[word];
  expect(first.kind === "word" && first.variant).toMatch(/^(gaming|animals)$/);
  await expect(page.getByRole("article").nth(word)).toContainText(first.text);
  expect(errors).toEqual([]);
});
