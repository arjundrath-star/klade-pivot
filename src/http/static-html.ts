/**
 * Headers for a response that is HTML with inline styles and nothing else: no script, no fetch,
 * never cached. The alert email preview and /demo's cookies page send one.
 */
export const STATIC_HTML_HEADERS = {
  "Content-Type": "text/html; charset=utf-8",
  "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'",
  "Cache-Control": "no-store",
} as const;
