/**
 * The mock phone's apps: made-up names and line glyphs, never a real app's name or logo. Plain
 * markup with no client code, so the phone panel and the rule forms share it.
 */
import type { LockCategory } from "@/session/lock";

type Glyph = readonly string[];

/** 24 x 24 line glyphs, one path per stroke. */
const GLYPHS = {
  chat: ["M4 5h16v11H9l-5 4z"],
  heart: ["M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"],
  pad: [
    "M7 8h10a5 5 0 0 1 5 5v1a3 3 0 0 1-5.4 1.8L15 14H9l-1.6 1.8A3 3 0 0 1 2 14v-1a5 5 0 0 1 5-5z",
    "M7 11v2M6 12h2M16 11.5h.01M18 12.5h.01",
  ],
  bolt: ["M13 2 4 14h7l-1 8 9-12h-7z"],
  play: ["M4 5h16v14H4z", "M10 9v6l5-3z"],
  film: ["M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z", "M10 8.5v7l6-3.5z"],
  screen: ["M3 5h18v12H3z", "M8 21h8M12 17v4"],
  note: [
    "M9 18V5l11-2v13",
    "M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM20 16a3 3 0 1 1-6 0 3 3 0 0 1 6 0z",
  ],
  phone: [
    "M5 3h4l2 5-2.5 1.5a11 11 0 0 0 6 6L16 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 5a2 2 0 0 1 2-2z",
  ],
  bubble: [
    "M12 4c5 0 9 3.1 9 7s-4 7-9 7a10 10 0 0 1-3-.4L4 20l1.4-4A6.6 6.6 0 0 1 3 11c0-3.9 4-7 9-7z",
  ],
  pin: ["M12 21s-6-5.6-6-11a6 6 0 0 1 12 0c0 5.4-6 11-6 11z", "M12 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4z"],
  book: ["M4 4h6a2 2 0 0 1 2 2v14a2 2 0 0 0-2-2H4z", "M20 4h-6a2 2 0 0 0-2 2v14a2 2 0 0 1 2-2h6z"],
  lock: ["M6 11h12v10H6z", "M8.5 11V8a3.5 3.5 0 0 1 7 0v3"],
  open: ["M6 11h12v10H6z", "M8.5 11V8a3.5 3.5 0 0 1 6.8-1.2"],
} satisfies Record<string, Glyph>;

export type GlyphName = keyof typeof GLYPHS;

export function AppGlyph({ name, className }: { name: GlyphName; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {GLYPHS[name].map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}

interface PhoneApp {
  name: string;
  glyph: GlyphName;
  /** The tile's color. */
  tile: string;
}

/** Two apps for each category the rule can lock. */
export const LOCKABLE_APPS: readonly (PhoneApp & { category: LockCategory })[] = [
  { name: "Chat", glyph: "chat", tile: "#F0645A", category: "social" },
  { name: "Feed", glyph: "heart", tile: "#E8902E", category: "social" },
  { name: "Arcade", glyph: "pad", tile: "#7C6CF0", category: "games" },
  { name: "Racer", glyph: "bolt", tile: "#3E6FE6", category: "games" },
  { name: "Clips", glyph: "play", tile: "#DB3F62", category: "video" },
  { name: "Reels", glyph: "film", tile: "#C2418F", category: "video" },
  { name: "Shows", glyph: "screen", tile: "#16958A", category: "streaming" },
  { name: "Tunes", glyph: "note", tile: "#2F8F4E", category: "streaming" },
];

/** The dock: what a rule can never lock (steering §3.1, always allowed). */
export const ALWAYS_ALLOWED_APPS: readonly PhoneApp[] = [
  { name: "Phone", glyph: "phone", tile: "#2E9B57" },
  { name: "Messages", glyph: "bubble", tile: "#2F7FE0" },
  { name: "Maps", glyph: "pin", tile: "#D9534A" },
  { name: "School", glyph: "book", tile: "#B7791F" },
];

/** The glyph each category shows in the rule forms. */
export const CATEGORY_GLYPHS: Readonly<Record<LockCategory, GlyphName>> = {
  social: "chat",
  games: "pad",
  video: "play",
  streaming: "screen",
};
