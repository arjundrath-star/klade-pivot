import { test, expect, type Page } from "@playwright/test";
import { watchConsole } from "./console";
import { answersFor, recordPass, renderedFor } from "../helpers/answers";
import type { AnsweredBlockId } from "@/session/blocks";

async function expectBlock(page: Page, label: string, position: number) {
  await expect(page.getByRole("heading", { level: 2, name: label })).toBeVisible();
  await expect(page.getByRole("progressbar")).toHaveAttribute("aria-valuenow", String(position));
}

async function solveBlock(page: Page, sessionId: string, block: AnsweredBlockId) {
  const answers = await answersFor(sessionId, block);
  const cards = page.getByRole("article");
  await expect(cards).toHaveCount(answers.length);
  for (const [i, answer] of answers.entries()) {
    await cards.nth(i).getByLabel("Your answer").fill(String(answer));
    await cards.nth(i).getByRole("button", { name: "Check" }).click();
    await expect(cards.nth(i).getByText("Correct.")).toBeVisible();
  }
}

test("a student walks all five blocks of a session and it is saved as they go", async ({
  page,
  browser,
}) => {
  const errors = watchConsole(page);
  await page.goto("/student");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Hi, Maya");
  await page.getByRole("button", { name: "Start" }).click();

  await expect(page).toHaveURL(/\/student\/session\/[0-9a-f-]{36}$/);
  const sessionId = page.url().split("/").pop() ?? "";

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

  const explanation = "I subtracted from both sides to keep the equation balanced, then divided.";
  await field.fill(explanation);
  await page.getByRole("button", { name: "Submit" }).click();
  // Without an API key the grader is unavailable: a visible error, never a pass.
  await expect(page.getByText(/grading unavailable/i)).toBeVisible();
  await expect(field).toHaveValue(explanation);
  await expect(next).toBeDisabled();

  // A graded pass written to the database stands in for the model, so the rest of the session
  // runs. The page reads it on reload like any stored result.
  await recordPass(sessionId, explanation);
  await page.reload();
  await expectBlock(page, "Explain-back", 4);
  await expect(page.getByText(/Passed\./)).toBeVisible();
  await next.click();
  await expectBlock(page, "Exit check", 5);
  await page.getByRole("button", { name: "Finish" }).click();

  await expect(page.getByRole("heading", { level: 1, name: "Session done" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { level: 1, name: "Session done" })).toBeVisible();
  expect(errors).toEqual([]);
});
