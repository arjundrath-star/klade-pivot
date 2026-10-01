/**
 * The gate password the smoke server starts with (playwright.config.ts) and the specs sign in
 * with. In a file of its own so the Playwright config can read it without the app's modules.
 */
export const SMOKE_ADMIN_PASSWORD = "smoke-gate";
