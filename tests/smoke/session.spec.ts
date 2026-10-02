import { watchConsole } from "./console";
import { expect, test } from "./fixtures";
import {
  answerExitCheck,
  expectBlock,
  passExplainBack,
  SEEDED_SESSIONS,
  SEEDED_STREAK,
  sessionXp,
  solveBlock,
  startSession,
} from "./flow";
import { answersFor, renderedFor, sessionAtExit, setTimerMode } from "../helpers/answers";
import { STREAK_REWARD_WEEKS } from "@/db/demo";

// From the demo seed: Maya has mastered the five concepts before two-step equations on her last
// five session days, and today is on her schedule, so finishing the session extends her streak.

test("a student walks all five blocks of a session and it is saved as they go", async ({
  page,
  browser,
}) => {
  const errors = watchConsole(page);
  await page.goto("/student");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Today");
  await expect(page.getByText(/^Hi, Maya\./)).toBeVisible();

  // The dashboard, signed in at the gate: the admin ribbon, today's card, the figures, the map.
  await expect(page.getByRole("region", { name: "Admin" })).toBeVisible();
  const todayCard = page.getByRole("region", { name: "Today's session" });
  await expect(todayCard).toContainText("Unit 2 of 9: Linear equations and inequalities");
  await expect(todayCard).toContainText("Solving two-step linear equations");
  await expect(todayCard).toContainText("Standard AI-A.REI.3");
  await expect(todayCard).toContainText("Concept 6 of 49");
  await expect(todayCard).toContainText("30 minutes");
  await expect(todayCard.getByText(/^Due today, 5:00 PM$/)).toBeVisible();
  await expect(todayCard.getByText(/^Phone: /)).toBeVisible();
  await expect(page.getByRole("progressbar", { name: "Course progress" })).toHaveAttribute(
    "aria-valuenow",
    String(SEEDED_SESSIONS),
  );
  await expect(page.getByText("10% of Algebra I. 1 of 9 units done.")).toBeVisible();
  const standing = page.getByRole("region", { name: "Your standing" });
  await expect(standing.getByText("Level 2", { exact: true })).toBeVisible();
  await expect(standing.getByText(`${SEEDED_STREAK}-session streak`)).toBeVisible();
  // This week's strip: today is on her schedule and not done yet.
  await expect(page.getByRole("region", { name: "This week" })).toContainText("today, scheduled");
  // The badges and the course map have pages of their own in the shell.
  await page.goto("/student/progress");
  await expect(page.getByText("Badges: 7 of 60")).toBeVisible();
  await page.goto("/student/course");
  const map = page.getByRole("region", { name: "Course", exact: true });
  await expect(map.getByRole("heading", { level: 2 })).toHaveCount(9);
  await expect(map.getByText("Mastered:")).toHaveCount(SEEDED_SESSIONS);
  await expect(map.getByText("Today:")).toHaveCount(1);
  await expect(map.getByText("Upcoming:")).toHaveCount(49 - SEEDED_SESSIONS - 1);
  await expect(map.getByRole("button", { name: "Go to today's session" })).toBeVisible();
  await page.goto("/student");
  const sessionId = await startSession(page);

  // The breadcrumb names the unit, the concept and its standard.
  const breadcrumb = page.getByRole("navigation", { name: "Breadcrumb" });
  await expect(breadcrumb).toContainText(
    "Algebra I › Unit 2: Linear equations and inequalities in one variable › Solving two-step linear equations · AI-A.REI.3",
  );
  await expect(breadcrumb).toContainText("Concept 6 of 49");

  await expectBlock(page, "Warm-up", 1);
  const timer = page.getByRole("timer");
  await expect(timer).toHaveText(/^\d+:\d\d left$/);
  const firstReading = await timer.textContent();
  await expect(timer).not.toHaveText(firstReading ?? "");

  const next = page.getByRole("button", { name: "Next" });
  await expect(next).toBeDisabled();
  const [answer] = await answersFor(sessionId, "warmup");
  const card = page.getByRole("article").first();
  await card.getByLabel("Your answer").fill(String(answer + 1));
  await card.getByRole("button", { name: "Check" }).click();
  await expect(card.getByText("Not quite. Try again.")).toBeVisible();
  await expect(next).toBeDisabled();

  await solveBlock(page, sessionId, "warmup");
  await next.click();
  await expectBlock(page, "Learn", 2);

  // A reload resumes at the stored block.
  await page.reload();
  await expectBlock(page, "Learn", 2);

  // Every step of the worked example comes one click at a time, then the student confirms.
  await expect(next).toBeDisabled();
  const steps = page.getByRole("list", { name: "Steps" }).getByRole("listitem");
  await expect(steps).toHaveCount(0);
  await page.getByRole("button", { name: "Show the first step" }).click();
  await expect(steps).toHaveCount(1);
  const more = page.getByRole("button", { name: "Show the next step" });
  while (await more.isVisible()) {
    const shown = await steps.count();
    await more.click();
    await expect(steps).toHaveCount(shown + 1);
  }
  await expect(steps.last()).toContainText("Check");
  await expect(next).toBeDisabled();
  await page.getByRole("button", { name: "I've read this" }).click();
  await expect(next).toBeEnabled();

  await next.click();
  await expectBlock(page, "Guided practice", 3);
  await expect(next).toBeDisabled();

  // Maya likes sports and music, so every guided word problem is framed as one of them.
  const guided = await renderedFor(sessionId, "guided");
  const cards = page.getByRole("article");
  await expect(cards).toHaveCount(5);
  const framed = guided.flatMap((problem, i) => (problem.kind === "word" ? [{ problem, i }] : []));
  expect(framed.length).toBeGreaterThanOrEqual(3);
  for (const { problem, i } of framed) {
    expect(["sports", "music"]).toContain(problem.kind === "word" && problem.variant);
    await expect(cards.nth(i)).toContainText(problem.text);
  }
  await solveBlock(page, sessionId, "guided");
  await next.click();

  await expectBlock(page, "Explain-back", 4);
  await expect(next).toBeDisabled();
  const field = page.getByLabel("Explain why each step works");

  // Voice: where the Web Speech API exists, speaking appends the transcript to the field. The
  // recognizer is a stand-in that "hears" one sentence, since the test has no microphone.
  await page.addInitScript(() => {
    class HeardOneSentence {
      continuous = false;
      interimResults = false;
      lang = "";
      onresult: ((event: unknown) => void) | null = null;
      onend: (() => void) | null = null;
      onerror = null;
      start() {
        setTimeout(() => {
          const result = Object.assign([{ transcript: "I took five away from both sides" }], {
            isFinal: true,
          });
          this.onresult?.({ resultIndex: 0, results: [result] });
          this.onend?.();
        }, 50);
      }
      stop() {}
      abort() {}
    }
    Object.defineProperty(window, "SpeechRecognition", { value: undefined, configurable: true });
    Object.defineProperty(window, "webkitSpeechRecognition", {
      value: HeardOneSentence,
      configurable: true,
    });
  });
  await page.reload();
  await page.getByRole("button", { name: "Speak" }).click();
  await expect(field).toHaveValue("I took five away from both sides");

  // Without the API there is no microphone button, and typing works.
  const noSpeech = await browser.newContext();
  await noSpeech.addInitScript(() => {
    for (const name of ["SpeechRecognition", "webkitSpeechRecognition"]) {
      Object.defineProperty(window, name, { value: undefined, configurable: true });
    }
  });
  const typing = await noSpeech.newPage();
  await typing.goto(page.url());
  await expectBlock(typing, "Explain-back", 4);
  await typing.getByLabel("Explain why each step works").fill("Typed instead.");
  await expect(typing.getByLabel("Explain why each step works")).toHaveValue("Typed instead.");
  await expect(typing.getByRole("button", { name: "Speak" })).toHaveCount(0);
  await noSpeech.close();

  // Without an API key the grader is unavailable: a visible error, never a pass. A stored pass
  // then stands in for the model, so the rest of the session runs.
  const explanation = "I subtracted from both sides to keep the equation balanced, then divided.";
  await passExplainBack(page, sessionId, explanation);
  await next.click();
  await expectBlock(page, "Exit check", 5);

  // One problem at a time, 90 seconds each, no coach and no way back to the lesson.
  await expect(page.getByText("1:30 for each problem.")).toBeVisible();
  const countdown = page.getByRole("timer", { name: "Time left on this problem" });
  await expect(countdown).toHaveText(/^1:(30|2\d) left$/);
  await expect(page.getByRole("button", { name: "Back" })).toBeDisabled();
  const finish = page.getByRole("button", { name: "Finish" });
  await expect(finish).toBeDisabled();
  await answerExitCheck(page, sessionId, [true, true, true]);
  await finish.click();

  // XP for the warm-up, every guided problem, the explain-back pass and the exit-check pass.
  const xp = sessionXp(guided.length);
  const expectEarned = async () => {
    await expect(page.getByRole("heading", { level: 1, name: "Mastered" })).toBeVisible();
    await expect(page.getByText("You got 3 of 3 on the exit check")).toBeVisible();
    const earned = page.getByRole("region", { name: "This session" });
    await expect(earned.getByText(`+${xp} XP`)).toBeVisible();
    await expect(earned.getByText(`${SEEDED_STREAK + 1}-session streak`)).toBeVisible();
    // Unit 2 has six more concepts, so only the concept badge comes with this session.
    const badges = earned.getByRole("list", { name: "Badges earned" }).getByRole("listitem");
    await expect(badges).toHaveCount(1);
    await expect(badges.first()).toContainText("Solving two-step linear equations mastered");
    // Maya's 4-week streak is one session short on any weekday; this session completes it.
    const unlocks = earned.getByRole("list", { name: "Rewards unlocked" }).getByRole("listitem");
    await expect(unlocks).toHaveText(/Reward unlocked: Pick your mentor for a free check-in/);
  };
  await expectEarned();
  await page.reload();
  await expectEarned();

  // The dashboard moved on: the concept is mastered and the next one is not built yet.
  await page.goto("/student");
  await expect(page.getByText("Every built session is done.")).toBeVisible();
  await expect(
    page.getByText(/^Next in the course: Equations with variables on both sides \(AI-A\.REI\.3\)/),
  ).toBeVisible();
  await expect(page.getByText("Level 2", { exact: true })).toBeVisible();
  await expect(page.getByText(`${xp * (SEEDED_SESSIONS + 1)} XP`, { exact: true })).toBeVisible();
  await expect(page.getByRole("progressbar", { name: "Course progress" })).toHaveAttribute(
    "aria-valuenow",
    String(SEEDED_SESSIONS + 1),
  );
  await expect(page.getByRole("progressbar", { name: "Unit 2 concepts mastered" })).toHaveAttribute(
    "aria-valuenow",
    "2",
  );
  await expect(page.getByText(`${SEEDED_STREAK + 1}-session streak`)).toBeVisible();
  await expect(page.getByRole("region", { name: "This week" })).toContainText("today, done");
  await page.goto("/student/progress");
  await expect(page.getByText("Badges: 8 of 60")).toBeVisible();
  const rewards = page.getByRole("region", { name: "Your rewards" });
  await expect(rewards.getByRole("progressbar", { name: /^4-week streak/ })).toHaveAttribute(
    "aria-valuenow",
    String(STREAK_REWARD_WEEKS),
  );
  await expect(rewards.getByText("Unlocked")).toHaveCount(1);
  await page.goto("/student/course");
  await expect(map.getByText("Mastered:")).toHaveCount(SEEDED_SESSIONS + 1);
  await expect(map.getByText("Today:")).toHaveCount(0);
  // The mentor's note quotes the explanation word for word.
  await page.goto("/student/mentor");
  const mentor = page.getByRole("region", { name: /^Your mentor/ });
  await expect(mentor.getByRole("blockquote")).toHaveText(explanation);

  await page.goto("/parent");
  await expect(page.getByText(`${SEEDED_STREAK + 1}-session streak`)).toBeVisible();
  await expect(page.getByText("Streak freeze banked")).toBeVisible();
  await expect(page.getByText("Earned: one free mentor check-in")).toHaveCount(1);
  await expect(page.getByRole("region", { name: "Course map" })).toContainText(
    `Maya has mastered ${SEEDED_SESSIONS + 1} of 49 concepts`,
  );

  // Reset demo from the ribbon on the student's screen puts the persona back.
  await page.goto("/student");
  const ribbon = page.getByRole("region", { name: "Admin" });
  const started = Date.now();
  await ribbon.getByRole("button", { name: "Reset demo" }).click();
  await expect(page).toHaveURL(/\/student\?notice=reset$/);
  await expect(ribbon.getByRole("status")).toHaveText(/^Demo reset\./);
  expect(Date.now() - started).toBeLessThan(5000);
  await expect(page.getByRole("button", { name: "Start" })).toBeVisible();
  await expect(page.getByRole("progressbar", { name: "Course progress" })).toHaveAttribute(
    "aria-valuenow",
    String(SEEDED_SESSIONS),
  );
  expect(errors).toEqual([]);
});

test("extended time gives each exit problem 135 seconds, and failing it repeats the concept", async ({
  page,
}) => {
  const errors = watchConsole(page);
  // There is no sign-in, so the browser is always Maya: she switches to extended time here.
  await setTimerMode("extended");
  const sessionId = await sessionAtExit();
  await page.goto(`/student/session/${sessionId}`);
  await expectBlock(page, "Exit check", 5);
  await expect(page.getByText("2:15 for each problem.")).toBeVisible();
  await expect(page.getByRole("timer", { name: "Time left on this problem" })).toHaveText(
    /^2:1[0-5] left$/,
  );

  // The same rule as standard time: 1 of 3 is not mastery.
  await answerExitCheck(page, sessionId, [true, false, false]);
  await page.getByRole("button", { name: "Finish" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Session done" })).toBeVisible();
  await expect(page.getByText("This concept repeats next session.")).toBeVisible();

  await page.getByRole("link", { name: "Back to today" }).click();
  await expect(page.getByText("Today: repeat solving two-step linear equations")).toBeVisible();
  expect(errors).toEqual([]);
});
