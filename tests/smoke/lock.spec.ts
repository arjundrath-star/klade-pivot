import type { Page } from "@playwright/test";
import { watchConsole } from "./console";
import { expect, test } from "./fixtures";
import { answerExitCheck, expectBlock, LOCKED } from "./flow";
import { removeLockRule, sessionAtExit } from "../helpers/answers";
import { XP_TABLE } from "@/engine/progress";

async function settingsNotice(page: Page, notice: string | RegExp) {
  await expect(page.getByRole("status")).toHaveText(notice);
}

test("a parent sets the phone rule, the demo clock locks the phone, and Unlock tonight opens it", async ({
  page,
  context,
}) => {
  const errors = watchConsole(page);
  // The seed has a rule; this is the parent making one.
  await removeLockRule();
  await page.goto("/parent");
  const phone = page.getByRole("region", { name: "Maya's phone" });
  await expect(phone.getByText("No phone rule yet.", { exact: true })).toBeVisible();
  await phone.getByRole("link", { name: "Set a phone rule" }).click();

  // The new rule starts from Maya's plan: her session days, her start time, games and social.
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Phone rule");
  for (const day of ["Mon", "Tue", "Thu", "Sun"]) {
    await expect(page.getByRole("checkbox", { name: day, exact: true })).toBeChecked();
  }
  await expect(page.getByRole("checkbox", { name: "Wed", exact: true })).not.toBeChecked();
  await expect(page.getByLabel("From")).toHaveValue("17:00");
  await expect(page.getByRole("checkbox", { name: "Games" })).toBeChecked();
  await expect(page.getByRole("checkbox", { name: "Social" })).toBeChecked();
  await expect(page.getByRole("checkbox", { name: "Video" })).not.toBeChecked();

  // Create, then edit: the rule persists across reloads.
  await page.getByRole("checkbox", { name: "Sun", exact: true }).uncheck();
  await page.getByRole("checkbox", { name: "Video" }).check();
  await page.getByRole("button", { name: "Save rule" }).click();
  await settingsNotice(page, "Phone rule saved.");
  await page.reload();
  const summary =
    "On Mon, Tue, and Thu, social, games, and video lock at 5:00 PM until Maya's session is done.";
  await expect(page.getByText(summary)).toBeVisible();
  await expect(page.getByRole("checkbox", { name: "Sun", exact: true })).not.toBeChecked();
  await expect(page.getByRole("checkbox", { name: "Video" })).toBeChecked();
  await page.getByRole("checkbox", { name: "Sun", exact: true }).check();
  await page.getByRole("checkbox", { name: "Video" }).uncheck();
  await page.getByRole("button", { name: "Save rule" }).click();
  await settingsNotice(page, "Phone rule saved.");

  // The master switch, off and back on, survives a reload.
  await page.getByRole("button", { name: "Turn the rule off" }).click();
  await settingsNotice(page, /Phone rule off/);
  await page.reload();
  await expect(page.getByText("The rule is off. Nothing locks.")).toBeVisible();
  await page.getByRole("button", { name: "Turn the rule on" }).click();
  await settingsNotice(page, "Phone rule on.");

  // Whatever the real day and hour, the demo clock makes it a session day just after 5 PM.
  await page.goto("/admin");
  await page.getByRole("button", { name: "Simulate: session day, 5:05 PM" }).click();
  await expect(page.getByRole("status")).toHaveText(/Demo clock set/);

  await page.goto("/parent");
  await expect(phone.getByText(LOCKED)).toBeVisible();
  await expect(phone.getByText("5:05", { exact: true })).toBeVisible();
  await expect(phone.getByRole("list", { name: "Apps" }).getByText(", locked")).toHaveCount(4);
  await expect(phone.getByRole("link", { name: "Open session" })).toHaveAttribute(
    "href",
    "/student",
  );

  // Unlock tonight from another tab: the open phone unlocks within one poll, no reload.
  const settings = await context.newPage();
  await settings.goto("/parent/settings");
  await settings.getByRole("button", { name: "Unlock tonight" }).click();
  await settingsNotice(settings, /Unlocked until midnight/);
  await expect(phone.getByText("Opened by a parent for tonight.")).toBeVisible({ timeout: 7000 });
  await expect(phone.getByText(LOCKED)).toHaveCount(0);

  // Editing the rule does not bring the lock back tonight.
  await settings.getByLabel("From").fill("16:00");
  await settings.getByRole("button", { name: "Save rule" }).click();
  await settingsNotice(settings, "Phone rule saved.");
  await page.reload();
  await expect(phone.getByText("A parent unlocked this phone until midnight.")).toBeVisible();
  const state = await page.request.get("/api/lock-state?view=parent");
  expect(await state.json()).toMatchObject({ locked: false, reason: "override" });

  // With the rule off, the core loop runs with a rule that locks nothing (AC 21).
  await settings.getByRole("button", { name: "Turn the rule off" }).click();
  await settingsNotice(settings, /Phone rule off/);
  await page.goto("/student");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Today");
  await expect(
    page.getByRole("region", { name: "Your phone" }).getByText("The phone rule is off."),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Start" })).toBeVisible();
  expect(errors).toEqual([]);
});

test("a new student's phone unlocks the moment the session is done, with the XP and streak", async ({
  page,
  context,
}) => {
  const errors = watchConsole(page);
  const next = page.getByRole("button", { name: "Next" });
  await page.goto("/onboarding");
  await page.getByLabel("Your first name").fill("Kim");
  await next.click();
  await page.getByLabel("Your child's first name").fill("Leo");
  await page.getByLabel("Grade").selectOption("8");
  await next.click();
  await next.click();
  await next.click();
  await page.getByRole("checkbox", { name: "Sports" }).check();
  await next.click();

  // Every day from midnight, so the phone is locked whenever the test runs.
  await expect(page.getByRole("heading", { name: "Phone rule" })).toBeFocused();
  for (const day of ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]) {
    await page.getByRole("checkbox", { name: day, exact: true }).check();
  }
  await page.getByLabel("From").fill("00:00");
  await page.getByRole("button", { name: "Finish setup" }).click();

  await expect(page).toHaveURL(/\/student$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Today");
  await expect(page.getByText(/^Hi, Leo\./)).toBeVisible();
  const phone = page.getByRole("region", { name: "Your phone" });
  await expect(phone.getByText(LOCKED)).toBeVisible();

  // Leo finishes the session in another tab while the phone stays on screen.
  const cookies = await context.cookies();
  const leo = cookies.find((cookie) => cookie.name === "klade_student")?.value ?? "";
  const sessionId = await sessionAtExit("pass", leo);
  const session = await context.newPage();
  await session.goto(`/student/session/${sessionId}`);
  await expectBlock(session, "Exit check", 5);
  await answerExitCheck(session, sessionId, [true, true, true]);
  await session.getByRole("button", { name: "Finish" }).click();
  await expect(session.getByRole("heading", { level: 1, name: "Mastered" })).toBeVisible();

  // Within one poll: unlocked, with what the session earned.
  await expect(phone.getByText(`+${XP_TABLE.exit} XP`)).toBeVisible({ timeout: 7000 });
  await expect(phone.getByText(/Session done\..*streak/)).toBeVisible();
  await expect(phone.getByText(LOCKED)).toHaveCount(0);
  await expect(phone.getByText("Today's session is done. Everything is open.")).toBeVisible();
  expect(errors).toEqual([]);
});
