/** The paths behind the gate. The proxy's matcher in src/proxy.ts spells out the same two. */
const GATED_PATHS = ["/admin", "/parent"] as const;

/** Whether a path is behind the gate: the path itself or anything below it, by whole segments. */
export function gatedPath(pathname: string): boolean {
  return GATED_PATHS.some((base) => pathname === base || pathname.startsWith(`${base}/`));
}

/** Where to send a browser that needs to sign in before `next`. */
export function gateUrl(next: string): string {
  return `/gate?next=${encodeURIComponent(next)}`;
}
