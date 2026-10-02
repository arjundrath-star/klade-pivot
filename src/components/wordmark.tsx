import { APP_NAME } from "@/config/app";

/** The mark from the app icon: a marigold F on night. */
function Mark() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className="size-7">
      <rect width="32" height="32" rx="9" className="fill-night" />
      <path
        d="M11 24V8h11M11 15.5h8"
        className="stroke-today"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

/**
 * The product's name at the top of every page, linking home. A plain anchor: a full navigation
 * is fine for the logo, and it keeps the link runtime out of routes that have no other link.
 */
export function Wordmark() {
  return (
    // The one anchor that is not a Link: a full navigation on the logo is fine, and the onboarding
    // route's first-load budget cannot carry the link runtime for it.
    // eslint-disable-next-line @next/next/no-html-link-for-pages
    <a href="/" className="focus-ring inline-flex items-center gap-2.5 rounded-full">
      <Mark />
      <span className="font-display text-lg font-bold tracking-tight">{APP_NAME}</span>
    </a>
  );
}
