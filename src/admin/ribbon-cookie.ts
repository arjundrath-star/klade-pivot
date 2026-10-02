/**
 * The admin ribbon's Hide choice, kept per browser so a recording stays clean across reloads. A
 * display preference only: it grants nothing, so the browser's own script writes it.
 */
import { SCHOOL_YEAR_SECONDS } from "@/session/cookies";

export const RIBBON_COOKIE = "klade_ribbon";

const HIDDEN = "hidden";

/** Whether the cookie's value folds the ribbon into its pill. */
export function ribbonHidden(value: string | undefined): boolean {
  return value === HIDDEN;
}

/** The `document.cookie` assignment that remembers `hidden`, or forgets it when false. */
export function ribbonCookie(hidden: boolean): string {
  return hidden
    ? `${RIBBON_COOKIE}=${HIDDEN}; Path=/; Max-Age=${SCHOOL_YEAR_SECONDS}; SameSite=Lax`
    : `${RIBBON_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
}
