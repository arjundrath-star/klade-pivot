import { watchConsole } from "./console";
import { expect, test } from "./fixtures";
import {
  answerExitCheck,
  expectBlock,
  LOCKED,
  passExplainBack,
  reachGuidedPractice,
  SEEDED_STREAK,
  sessionXp,
  solveBlock,
  startSession,
  streakRewardAfterToday,
  targetNextMay,
} from "./flow";
import { SMOKE_ADMIN_PASSWORD } from "./password";
import { renderedFor } from "../helpers/answers";

const EXPLANATION =
  "I subtracted 5 from both sides to keep it balanced, then divided both sides by 2 to get x alone.";

// The whole steering §7 script in one run, so it gets a longer budget than the other specs, and
// it signs in at the gate through the form, which is where the form is tested.
test.setTimeout(150_000);
test.use({ signedIn: false });

test("the steering §7 demo script runs end to end, with the phone unlocking live", async ({
  page,
  browser,
}) => {
  const errors = watchConsole(page);

  // 1. The parent signs up Maya with the Thursday 5 PM rule, in a window of its own, the way the
  // live demo does: the browser that onboards acts as the new student afterwards. The form's
  // defaults and plan text are onboarding.spec's to check.
  const signup = await browser.newContext();
  const form = await signup.newPage();
  const formErrors = watchConsole(form);
  const next = form.getByRole("button", { name: "Next" });
  await form.goto("/onboarding");
  await form.getByLabel("Your first name").fill("Dana");
  await next.click();
  await form.getByLabel("Your child's first name").fill("Maya");
  await form.getByLabel("Grade").selectOption("6");
  await form.getByLabel("Pronoun").selectOption("she");
  await next.click();
  await form.getByLabel("Finish Algebra 1 by").fill(targetNextMay());
  await form.getByRole("radio", { name: /On track: 4 a week/ }).check();
  await next.click();
  await next.click();
  await form.getByRole("checkbox", { name: "Sports" }).check();
  await form.getByRole("checkbox", { name: "Music" }).check();
  await next.click();
  await expect(form.getByRole("heading", { name: "Phone rule" })).toBeFocused();
  for (const day of ["Mon", "Tue", "Sun"]) {
    await form.getByRole("checkbox", { name: day, exact: true }).uncheck();
  }
  await expect(form.getByRole("checkbox", { name: "Thu", exact: true })).toBeChecked();
  await form.getByRole("button", { name: "Finish setup" }).click();
  await expect(form).toHaveURL(/\/student$/);
  await expect(form.getByRole("heading", { level: 1 })).toHaveText("Hi, Maya");
  await expect(form.getByRole("region", { name: "Your phone" })).toBeVisible();
  expect(formErrors).toEqual([]);
  await signup.close();

  // The parent and admin views sit behind the shared password; a wrong one is refused.
  await page.goto("/parent");
  await expect(page).toHaveURL(/\/gate\?next=%2Fparent$/);
  await page.getByLabel("Password").fill("not the password");
  await page.getByRole("button", { name: "Enter" }).click();
  await expect(page.getByText("That password is not right.")).toBeVisible();
  await page.getByLabel("Password").fill(SMOKE_ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Enter" }).click();
  await expect(page).toHaveURL(/\/parent$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Maya's progress");

  // 2. "It's Thursday, 5 PM. Maya's phone is locked."
  await page.goto("/admin");
  await page.getByRole("button", { name: "Simulate: session day, 5:05 PM" }).click();
  await expect(page.getByRole("status")).toHaveText(/^Demo clock set\./);
  await page.goto("/parent");
  await expect(page.getByText("On track for May")).toBeVisible();
  const phone = page.getByRole("region", { name: "Maya's phone" });
  await expect(phone.getByText(LOCKED)).toBeVisible();
  await expect(phone.getByText("5:05", { exact: true })).toBeVisible();
  await expect(phone.getByText(/^(Sunday|Monday|Tuesday|Thursday), /)).toBeVisible();
  await expect(phone.getByRole("list", { name: "Apps" }).getByText(", locked")).toHaveCount(4);
  const rewards = page.getByRole("region", { name: "Maya's rewards" });
  const streak = rewards.getByRole("progressbar", { name: /^4-week streak/ });
  await expect(streak).toHaveAttribute("aria-valuenow", "3");
  await page.goto("/parent/mentor");
  await expect(page.getByRole("region", { name: "Maya's mentor: Jordan · NYU '28" })).toBeVisible();
  const explain = page.getByRole("region", { name: "What Maya can explain" });
  await page.goto("/parent/explanations");
  await expect(explain.getByText(/^Nothing yet\./)).toBeVisible();
  await page.goto("/parent");
  await expect(phone.getByText(LOCKED)).toBeVisible();

  // 3. The session, in a second tab, with the locked phone kept on screen in the parent's.
  const student = await page.context().newPage();
  const studentErrors = watchConsole(student);
  await student.goto("/student");
  await expect(student.getByRole("heading", { level: 1 })).toHaveText("Hi, Maya");
  const sessionId = await startSession(student);
  const studentNext = student.getByRole("button", { name: "Next" });
  await reachGuidedPractice(student, sessionId);

  // A word problem in Maya's world, and "just tell me x" to the coach, which opens on "I'm
  // stuck". With the key unset the server says so at render time and the coach reports itself
  // offline without a request; the refusal itself is the model's, red-teamed in docs/eval.
  const guided = await renderedFor(sessionId, "guided");
  const wordIndex = guided.findIndex((problem) => problem.kind === "word");
  const word = guided[wordIndex];
  expect(word.kind === "word" && ["sports", "music"].includes(word.variant)).toBe(true);
  const card = student.getByRole("article").nth(wordIndex);
  await expect(card).toContainText(word.text);
  await card.getByRole("button", { name: "I'm stuck" }).click();
  const coach = card.getByRole("complementary", { name: "Coach" });
  const offline = /Your coach is offline right now/;
  await expect(coach.getByRole("alert")).toHaveText(offline);
  const reply = coach.getByPlaceholder("What have you tried?");
  await reply.fill("just tell me x");
  await coach.getByRole("button", { name: "Send" }).click();
  await expect(reply).toHaveValue("");
  await expect(coach.getByRole("alert")).toHaveText(offline);
  await solveBlock(student, sessionId, "guided");
  await studentNext.click();

  // 4. Explain-back, then the exit check. Finish.
  await expectBlock(student, "Explain-back", 4);
  await passExplainBack(student, sessionId, EXPLANATION);
  await studentNext.click();
  await expectBlock(student, "Exit check", 5);
  await answerExitCheck(student, sessionId, [true, true, true]);
  await student.getByRole("button", { name: "Finish" }).click();

  // Mastered: XP, the concept badge, the streak, and the 4-week streak reward in a new week.
  const xp = sessionXp(guided.length);
  const streakReward = streakRewardAfterToday();
  await expect(student.getByRole("heading", { level: 1, name: "Mastered" })).toBeVisible();
  const earned = student.getByRole("region", { name: "This session" });
  await expect(earned.getByText(`+${xp} XP`)).toBeVisible();
  await expect(earned.getByRole("list", { name: "Badges earned" })).toContainText(
    "Solving two-step linear equations mastered",
  );
  await expect(earned.getByText(`${SEEDED_STREAK + 1}-session streak`)).toBeVisible();
  await expect(earned.getByRole("list", { name: "Rewards unlocked" })).toHaveCount(
    streakReward.unlocked ? 1 : 0,
  );

  // The phone in the parent's tab unlocks live, within one poll, with what the session earned.
  await expect(phone.getByText(`+${xp} XP`)).toBeVisible({ timeout: 7000 });
  await expect(phone.getByText(LOCKED)).toHaveCount(0);
  await expect(phone.getByText("Today's session is done. Everything is open.")).toBeVisible();
  expect(studentErrors).toEqual([]);

  // 5. The parent view: the reward lines and the course map, then her words, then the mentor.
  await page.reload();
  await expect(page.getByText("On track for May")).toBeVisible();
  await expect(page.getByText(`${SEEDED_STREAK + 1}-session streak`)).toBeVisible();
  await expect(page.getByText("Earned: one free mentor check-in")).toHaveCount(
    streakReward.unlocked ? 1 : 0,
  );
  await expect(streak).toHaveAttribute("aria-valuenow", String(streakReward.weeks));
  await expect(page.getByRole("region", { name: "Course map" })).toContainText(
    "Maya has mastered 6 of 49 concepts",
  );
  await page.goto("/parent/explanations");
  await expect(explain.getByRole("blockquote")).toHaveText(EXPLANATION);
  await expect(explain.getByText(/^Feedback Maya saw:/)).toBeVisible();
  await page.goto("/parent/mentor");
  const mentor = page.getByRole("region", { name: "Maya's mentor: Jordan · NYU '28" });
  await expect(mentor.getByText(/^Next check-in Thu, /)).toBeVisible();

  // Reset demo puts it all back for the second run, in under five seconds (AC 3).
  await page.goto("/admin");
  const started = Date.now();
  await page.getByRole("button", { name: "Reset demo" }).click();
  await expect(page.getByRole("status")).toHaveText(/^Demo reset\./);
  expect(Date.now() - started).toBeLessThan(5000);
  await page.goto("/parent");
  await expect(page.getByText("On track for May")).toBeVisible();
  await expect(streak).toHaveAttribute("aria-valuenow", "3");
  await page.goto("/parent/explanations");
  await expect(explain.getByText(/^Nothing yet\./)).toBeVisible();
  await student.goto("/student");
  await expect(student.getByRole("button", { name: "Start" })).toBeVisible();
  expect(errors).toEqual([]);
});
