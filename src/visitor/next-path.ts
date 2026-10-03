import { pathnameOf, SitePath } from "@/gate/next-path";
import { visitorPath } from "@/visitor/paths";

/**
 * Where /demo sends the browser once it has its copy: one of the student's or the parent's pages.
 * Anything else falls back to the student's home.
 */
export const DemoNext = SitePath.refine((path) => visitorPath(pathnameOf(path))).catch("/student");
