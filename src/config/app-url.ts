import { z } from "zod";

const parsed = z.url().safeParse(process.env.NEXT_PUBLIC_APP_URL);

/**
 * The app's public origin, from NEXT_PUBLIC_APP_URL in the host's environment, for links that
 * leave the site: page metadata and the parent's alert email, which has no request to borrow a
 * host from when it is sent for real. Undefined when unset or not a URL, and callers fall back to
 * the request.
 */
export const APP_URL: URL | undefined = parsed.success ? new URL(parsed.data) : undefined;
