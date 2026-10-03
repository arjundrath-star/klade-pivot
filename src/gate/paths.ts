/** Whether `pathname` is `base` or anything below it, by whole segments: never /parents. */
export function under(base: string, pathname: string): boolean {
  return pathname === base || pathname.startsWith(`${base}/`);
}

/** The areas the gate signs a browser into: where it may send one after the password. */
const GATED_PATHS = ["/admin", "/parent"] as const;

/** Whether a path is one the gate signs into. */
export function gatedPath(pathname: string): boolean {
  return GATED_PATHS.some((base) => under(base, pathname));
}

/**
 * Whether a path is only ever the founder's: the admin panel and everything below it. The parent
 * pages open to a visitor's copy too (milestone 20); the alert email preview under them checks the
 * gate in its own handler.
 */
export function adminPath(pathname: string): boolean {
  return under("/admin", pathname);
}

/** `path` with `next`, where the browser goes on afterwards, in its query. */
export function withNext(path: string, next: string): string {
  return `${path}?next=${encodeURIComponent(next)}`;
}

/** Where to send a browser that needs to sign in before `next`. */
export function gateUrl(next: string): string {
  return withNext("/gate", next);
}
