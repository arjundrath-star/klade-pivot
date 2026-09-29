import type { Page } from "@playwright/test";

/** Collects console errors and uncaught page errors; every smoke spec asserts the list is empty. */
export function watchConsole(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  page.on("pageerror", (err) => errors.push(err.message));
  return errors;
}
