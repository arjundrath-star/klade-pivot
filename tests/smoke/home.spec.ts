import { watchConsole } from "./console";
import { expect, test } from "./fixtures";

test("home page renders without console errors", async ({ page }) => {
  const errors = watchConsole(page);
  const response = await page.goto("/");
  expect(response?.status()).toBe(200);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("give them a foothold");
  expect(errors).toEqual([]);
});
