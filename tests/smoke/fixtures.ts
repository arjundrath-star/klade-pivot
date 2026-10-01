import { test as base } from "@playwright/test";
import { SMOKE_ADMIN_PASSWORD } from "./password";
import { resetDemoData } from "@/db/demo";
import { freshGateToken, GATE_COOKIE } from "@/gate/token";

interface SmokeFixtures {
  /** Whether the browser starts signed in at the gate. `test.use({ signedIn: false })` to sign in by hand. */
  signedIn: boolean;
  demoSeed: void;
}

/**
 * Every smoke test starts from the demo's seeded state, the way "Reset demo" leaves it, so the
 * spec files run in any order, and signed in at the gate unless the spec says otherwise, so it can
 * open the parent and admin views.
 */
export const test = base.extend<SmokeFixtures>({
  signedIn: [true, { option: true }],
  demoSeed: [
    async ({ page, signedIn }, use) => {
      await resetDemoData();
      if (signedIn) {
        const value = freshGateToken(SMOKE_ADMIN_PASSWORD);
        await page
          .context()
          .addCookies([{ name: GATE_COOKIE, value, domain: "localhost", path: "/" }]);
      }
      await use();
    },
    { auto: true },
  ],
});

export { expect } from "@playwright/test";
