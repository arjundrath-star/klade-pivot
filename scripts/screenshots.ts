/**
 * Captures the README's three demo-order screenshots and the deck's page captures against the
 * production build, signed in at the gate, 1440px wide. Boots the built app on its own database
 * in the demo's starting state, sets the demo clock to a session day so the phone shows locked,
 * runs the session as far as the coach and then to the end, and writes PNGs to docs/screenshots.
 * Requires `next build` first. With ANTHROPIC_API_KEY set the coach answers for real; without it
 * the session capture shows the coach's offline state. Usage: npm run screenshots
 */
import { spawn, spawnSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { chromium, expect, type Page } from "@playwright/test";
import {
  answerExitCheck,
  reachGuidedPractice,
  solveBlock,
  startSession,
} from "../tests/smoke/flow";
import { recordPass } from "../tests/helpers/answers";
import { GATE_COOKIE, freshGateToken } from "@/gate/token";

const PORT = 3102;
const BASE = `http://localhost:${PORT}`;
const PASSWORD = "screenshots";
const OUT = "docs/screenshots";
const DECK = `${OUT}/deck`;
const WIDTH = 1440;

/** The pages a judge sees, in demo order, each as a deck capture. */
const DECK_PAGES = [
  ["/", "home"],
  ["/onboarding", "onboarding"],
  ["/student", "student-today"],
  ["/student/course", "student-course"],
  ["/student/calendar", "student-calendar"],
  ["/student/progress", "student-progress"],
  ["/student/mentor", "student-mentor"],
  ["/parent", "parent-overview"],
  ["/parent/explanations", "parent-explanations"],
  ["/parent/alerts", "parent-alerts"],
  ["/parent/settings", "parent-phone-rule"],
  ["/parent/mentor", "parent-mentor"],
] as const;

const EXPLANATION =
  "I subtracted the same number from both sides to keep it balanced, then divided both sides by the coefficient so x was alone.";

process.env.DATABASE_URL = "file:./data/screenshots.db";
const serverEnv = { ...process.env, ADMIN_PASSWORD: PASSWORD };

async function waitFor(url: string, ms: number): Promise<void> {
  const deadline = Date.now() + ms;
  while (Date.now() < deadline) {
    try {
      if ((await fetch(url)).ok) return;
    } catch {
      // Not up yet.
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`the server did not answer at ${url} within ${ms}ms`);
}

async function capture(page: Page, path: string, file: string): Promise<void> {
  await page.goto(path);
  await page.waitForLoadState("networkidle");
  await page.screenshot({ path: file, fullPage: true });
  console.log(file);
}

async function main(): Promise<void> {
  const seeded = spawnSync("npm", ["run", "-s", "db:reset", "--", "--demo"], {
    stdio: ["ignore", "inherit", "inherit"],
    env: serverEnv,
  });
  if (seeded.status !== 0) process.exit(1);

  const server = spawn("npx", ["next", "start", "-p", String(PORT)], {
    stdio: "ignore",
    detached: true,
    env: serverEnv,
  });

  try {
    await waitFor(BASE, 60_000);
    mkdirSync(DECK, { recursive: true });
    const browser = await chromium.launch();
    const context = await browser.newContext({
      baseURL: BASE,
      viewport: { width: WIDTH, height: 900 },
      deviceScaleFactor: 1,
      // The end screen's reveal is instant, so its capture needs no wait.
      reducedMotion: "reduce",
    });
    await context.addCookies([
      { name: GATE_COOKIE, value: freshGateToken(PASSWORD), domain: "localhost", path: "/" },
    ]);
    const page = await context.newPage();

    // The demo clock on a session day at 5:05 PM, so the phone reads locked.
    await page.goto("/admin");
    await page.getByRole("button", { name: /^Simulate: session day/ }).click();
    await expect(page.getByRole("status")).toHaveText(/^Demo clock set\./);

    for (const [path, name] of DECK_PAGES) await capture(page, path, `${DECK}/${name}.png`);

    // 1. The parent's phone, locked, as the demo's second step shows it.
    await page.goto("/parent");
    await page.waitForLoadState("networkidle");
    await page
      .getByRole("region", { name: "Maya's phone" })
      .screenshot({ path: `${OUT}/1-phone-locked.png` });
    console.log(`${OUT}/1-phone-locked.png`);

    // 2. The session at guided practice, with "just tell me x" put to the coach.
    await page.goto("/student");
    const sessionId = await startSession(page);
    await reachGuidedPractice(page, sessionId);
    const first = page.getByRole("article", { name: "Problem" });
    await first.getByRole("button", { name: "I'm stuck" }).click();
    const coach = first.getByRole("complementary", { name: "Coach" });
    await coach.getByLabel("Reply to your coach").fill("just tell me x");
    await coach.getByRole("button", { name: "Send" }).click();
    // The coach's reply streams in as a turn, or without a key the panel says it is offline.
    await expect(coach.getByRole("listitem").or(coach.getByRole("alert")).first()).toBeVisible({
      timeout: 30_000,
    });
    await page.waitForTimeout(2500);
    await page.screenshot({ path: `${OUT}/2-session-coach.png`, fullPage: true });
    await page.screenshot({ path: `${DECK}/student-session.png`, fullPage: true });
    console.log(`${OUT}/2-session-coach.png`);

    // Through the explain-back (a graded pass stands in for the model) and the exit check.
    const next = page.getByRole("button", { name: "Next" });
    await solveBlock(page, sessionId, "guided");
    await next.click();
    await expect(page.getByRole("heading", { level: 1, name: "Explain-back" })).toBeVisible();
    await recordPass(sessionId, EXPLANATION);
    await page.reload();
    await expect(page.getByText(/Passed\./)).toBeVisible();
    await next.click();
    await expect(page.getByRole("heading", { level: 1, name: "Exit check" })).toBeVisible();
    await answerExitCheck(page, sessionId, [true, true, true]);
    await page.getByRole("button", { name: "Finish" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Mastered" })).toBeVisible();
    await page.screenshot({ path: `${DECK}/student-session-complete.png`, fullPage: true });
    console.log(`${DECK}/student-session-complete.png`);

    // 3. The parent view after the session: the phone open, the reward earned, the map moved on.
    await capture(page, "/parent", `${OUT}/3-parent-view.png`);
    await capture(page, "/parent/explanations", `${DECK}/parent-explanations-after.png`);
    await browser.close();
  } finally {
    try {
      process.kill(-server.pid!, "SIGTERM");
    } catch {
      server.kill("SIGTERM");
    }
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
