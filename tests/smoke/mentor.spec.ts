import { watchConsole } from "./console";
import { expect, test } from "./fixtures";
import { removePrototypeRows } from "../helpers/answers";

// From the demo seed: Maya has no session yet, so her seeded 4-week streak reads 3 of 4.

test("the rewards panel and the mentor card show on both views, and Join opens the waiting room", async ({
  page,
}) => {
  const errors = watchConsole(page);
  await page.goto("/student/progress");
  const rewards = page.getByRole("region", { name: "Your rewards" });
  await expect(rewards.getByText("Prototype")).toBeVisible();
  await expect(rewards.getByText("Pick your mentor for a free check-in")).toBeVisible();
  const streak = rewards.getByRole("progressbar", { name: "4-week streak: 3 of 4 weeks" });
  await expect(streak).toHaveAttribute("aria-valuenow", "3");
  await expect(rewards.getByRole("progressbar")).toHaveCount(4);

  await page.goto("/student/mentor");
  const mentor = page.getByRole("region", { name: "Your mentor: Jordan · NYU '28" });
  await expect(mentor.getByText("Premium · prototype")).toBeVisible();
  await expect(
    mentor.getByText(/^Next check-in \w{3}, \w{3} \d+, 7:00 PM \(10 min\)$/),
  ).toBeVisible();
  // No explanation yet, so there is nothing to quote.
  await expect(mentor.getByText(/I'll read your first explain-back/)).toBeVisible();
  await mentor.getByRole("link", { name: "Join" }).click();
  await expect(page).toHaveURL(/\/mentor\/waiting-room$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Waiting for your mentor");
  await expect(page.getByText(/no video in this demo/)).toBeVisible();

  await page.goto("/parent");
  const parentRewards = page.getByRole("region", { name: "Maya's rewards" });
  await expect(
    parentRewards.getByText(/finish by May 31, \d{4} → first month of Geometry free/),
  ).toBeVisible();
  await expect(parentRewards.getByText("One free mentor check-in")).toBeVisible();
  await expect(parentRewards.getByText(/^Earned:/)).toHaveCount(0);
  await page.goto("/parent/mentor");
  const parentMentor = page.getByRole("region", { name: "Maya's mentor: Jordan · NYU '28" });
  await expect(parentMentor.getByText(/^Last check-in, /)).toBeVisible();
  await expect(parentMentor.getByText(/^Next check-in /)).toBeVisible();
  expect(errors).toEqual([]);
});

test("with the prototype rows missing, the core pages render without them", async ({ page }) => {
  const errors = watchConsole(page);
  await removePrototypeRows();
  await page.goto("/student");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Hi, Maya");
  await expect(page.getByRole("heading", { name: "Today's session" })).toBeVisible();
  await expect(page.getByRole("button", { name: /^(Start|Resume)$/ })).toBeVisible();
  await page.goto("/student/progress");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Progress");
  await expect(page.getByRole("region", { name: "Your rewards" })).toHaveCount(0);
  await page.goto("/student/mentor");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Mentor");
  await expect(page.getByRole("region", { name: /mentor/ })).toHaveCount(0);

  await page.goto("/parent");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Maya's progress");
  await expect(page.getByRole("heading", { name: "Course map" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Maya's rewards" })).toHaveCount(0);
  await page.goto("/parent/mentor");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Mentor");
  await expect(page.getByRole("region", { name: /mentor/ })).toHaveCount(0);
  expect(errors).toEqual([]);
});
