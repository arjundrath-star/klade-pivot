import { z } from "zod";
import { gatedPath } from "@/gate/paths";

/**
 * A path on this site with an optional query: one leading slash and no scheme or host, so a
 * `next` parameter can never send a browser off the site. Each use refines it to its own area.
 */
export const SitePath = z
  .string()
  .max(200)
  .regex(/^\/[^/\\\s][^\\\s]*$/);

/** The path part of a site path, without its query. */
export function pathnameOf(path: string): string {
  return path.split("?")[0];
}

/** Where the gate sends the browser after a right password: a path behind the gate. */
export const NextPath = SitePath.refine((path) => gatedPath(pathnameOf(path)));
