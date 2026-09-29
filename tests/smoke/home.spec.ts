import { test, expect } from "@playwright/test";
import { watchConsole } from "./console";

test("home page renders without console errors", async ({ page }) => {
  const errors = watchConsole(page);
  const response = await page.goto("/");
  expect(response?.status()).toBe(200);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("makes them do it");
  expect(errors).toEqual([]);
});
