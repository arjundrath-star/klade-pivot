import { z } from "zod";
import { gatedPath } from "@/gate/paths";

/**
 * Where the gate sends the browser after a right password: a path behind the gate, with an
 * optional query. One leading slash and no scheme or host, so the gate can never send a browser
 * off the site.
 */
export const NextPath = z
  .string()
  .max(200)
  .regex(/^\/[^/\\\s][^\\\s]*$/)
  .refine((path) => gatedPath(path.split("?")[0]));
