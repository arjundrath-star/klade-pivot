import { StrokeGlyph } from "@/components/ui/stroke-glyph";

/** Line glyphs for the navigation, 24 x 24, one path per stroke. */
const GLYPHS = {
  home: ["M3 11 12 4l9 7", "M5 10v10h14V10"],
  course: ["M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z", "M4 19a2 2 0 0 1 2-2h13"],
  calendar: ["M4 6h16v14H4z", "M4 10h16M8 3v4M16 3v4"],
  progress: ["M4 20h16", "M7 16v-4M12 16V8M17 16V5"],
  mentor: ["M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z", "M4 21a8 8 0 0 1 16 0"],
  overview: ["M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z"],
  explanations: ["M5 7h6v6l-2 4H6l2-4H5zM13 7h6v6l-2 4h-3l2-4h-3z"],
  alerts: ["M6 16v-5a6 6 0 0 1 12 0v5l1.5 2h-15z", "M10 20a2 2 0 0 0 4 0"],
  phone: ["M8 2h8a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z", "M11 18h2"],
} satisfies Record<string, readonly string[]>;

export type NavGlyphName = keyof typeof GLYPHS;

export function NavGlyph({ name, className }: { name: NavGlyphName; className?: string }) {
  return <StrokeGlyph paths={GLYPHS[name]} className={className} />;
}
