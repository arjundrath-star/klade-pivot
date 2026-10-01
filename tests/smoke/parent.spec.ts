import { watchConsole } from "./console";
import { expect, test } from "./fixtures";
import { renderedFor, sessionAt } from "../helpers/answers";

// From the demo seed: today is on Maya's schedule and nothing is done, so it can be missed.

test("the parent sees a missed session and the admin switches the interest live", async ({
  page,
}) => {
  const errors = watchConsole(page);
  await page.goto("/parent");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Maya's progress");
  await expect(page.getByText("On track for May")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Mastery" })).toBeVisible();
  await expect(page.getByRole("rowheader", { name: "Two-step equations" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Session history" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "What Maya can explain" })).toBeVisible();

  await page.goto("/admin");
  await page.getByRole("button", { name: "Simulate missed session" }).click();
  await expect(page.getByRole("status")).toHaveText(/marked missed/);

  await page.goto("/parent");
  const alert = "Maya missed today's Algebra session. She's 1 session behind her May target.";
  await expect(page.getByText(alert)).toBeVisible();
  await expect(page.getByText("1 session behind", { exact: true })).toBeVisible();

  // The email preview is the email itself.
  await page.getByRole("link", { name: "Email preview" }).click();
  await expect(page).toHaveURL(/\/parent\/alerts\/[0-9a-f-]{36}\/preview$/);
  await expect(page.getByText(alert)).toBeVisible();
  await expect(page.getByRole("link", { name: "See Maya's progress" })).toBeVisible();

  await page.goto("/admin");
  await page.getByRole("radio", { name: "gaming" }).check();
  await page.getByRole("button", { name: "Switch interest" }).click();
  await expect(page.getByRole("status")).toHaveText(/Interest switched/);

  // A new session's first word problem comes framed in gaming.
  const sessionId = await sessionAt("guided");
  const gaming = await renderedFor(sessionId, "guided", ["gaming"]);
  const sports = await renderedFor(sessionId, "guided", ["sports"]);
  const word = gaming.findIndex((problem) => problem.kind === "word");
  expect(gaming[word].text).not.toBe(sports[word].text);
  await page.goto(`/student/session/${sessionId}`);
  await expect(page.getByRole("article").nth(word)).toContainText(gaming[word].text);
  expect(errors).toEqual([]);
});
