/** The few marks the system draws itself: a check, a cross, a chevron, a flame, a star, a microphone, a play mark. */

interface GlyphProps {
  className: string;
}

export function CheckGlyph({ className }: GlyphProps) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className={`fill-none stroke-current ${className}`}>
      <path d="m3.5 8.5 3 3 6-7" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function CrossGlyph({ className }: GlyphProps) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className={`fill-none stroke-current ${className}`}>
      <path d="m4 4 8 8M12 4l-8 8" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

/** Points down; the caller turns it when a disclosure is open. */
export function ChevronGlyph({ className }: GlyphProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={`fill-none stroke-current ${className}`}>
      <path d="m6 9 6 6 6-6" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function FlameGlyph({ className }: GlyphProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={`fill-current ${className}`}>
      <path d="M12 2c.6 3.2-1 5.3-2.6 7.2C7.8 11 6 13 6 15.8 6 19.2 8.7 22 12 22s6-2.8 6-6.2c0-2.4-1.2-4.1-2.4-5.5-.3 1.4-1 2.5-2.1 3 .3-3.9-.6-8.4-1.5-11.3Z" />
    </svg>
  );
}

export function StarGlyph({ className }: GlyphProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={`fill-current ${className}`}>
      <path d="m12 2.8 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.1 6.4 20l1.1-6.2L3 9.4l6.2-.9L12 2.8Z" />
    </svg>
  );
}

export function MicGlyph({ className }: GlyphProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={`fill-none stroke-current ${className}`}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0M12 18v3M9 21h6" />
    </svg>
  );
}

/** A play mark, on the chapter's video cards. */
export function PlayGlyph({ className }: GlyphProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={`fill-current ${className}`}>
      <path d="M8 5.5v13l11-6.5-11-6.5Z" />
    </svg>
  );
}
