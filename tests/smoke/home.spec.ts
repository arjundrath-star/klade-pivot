import { test, expect, type Page } from "@playwright/test";

// Every smoke spec collects console errors and fails the test if any appear.
function watchConsole(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  page.on("pageerror", (err) => errors.push(err.message));
  return errors;
}

test("home page renders without console errors", async ({ page }) => {
  const errors = watchConsole(page);
  const response = await page.goto("/");
  expect(response?.status()).toBe(200);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("makes them do it");
  expect(errors).toEqual([]);
});
