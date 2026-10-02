/** About a school year, long enough to outlast the MVP pilot. */
export const SCHOOL_YEAR_SECONDS = 60 * 60 * 24 * 365;

/**
 * Options for a cookie the browser's scripts can never read: this site only, sent on same-site
 * navigations, over HTTPS in production, for `maxAge` seconds. The student cookie and the gate
 * cookie are both set this way.
 */
export function httpOnlyCookie(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  };
}
