import { under, withNext } from "@/gate/paths";

/**
 * Where a browser that is nobody yet gets its copy of the demo (milestone 20): the proxy sends it
 * here with a fresh student cookie, and the route builds the copy and sends it back to `next`.
 */
export const DEMO_PATH = "/demo";

/** The pages a visitor's copy serves: the student's and the parent's. */
const VISITOR_PATHS = ["/student", "/parent"] as const;

/**
 * Whether a path is one a new copy can land on, by whole segments: the student's and the
 * parent's pages, but not a session, which belongs to the copy that opened it. A browser sent
 * here from one (a session URL passed on, or a copy the sweep removed mid-session) starts at the
 * student's home.
 */
export function visitorPath(pathname: string): boolean {
  if (under("/student/session", pathname)) return false;
  return VISITOR_PATHS.some((base) => under(base, pathname));
}

/** Where to send a browser that needs its copy before `next`. */
export function demoUrl(next: string): string {
  return withNext(DEMO_PATH, next);
}
