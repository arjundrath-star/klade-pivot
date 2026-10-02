import { StarGlyph } from "@/components/ui/glyphs";

const TONES = {
  /** A badge, in the progress color. */
  progress: "bg-progress text-ink",
  /** A completion reward, in the mentor's color. */
  mentor: "bg-mentor-deep text-white",
} as const;

interface BadgeItemProps {
  label: string;
  detail: string;
  tone?: keyof typeof TONES;
}

/** One earned badge or reward as a row: a star on its color, its name and what earned it. */
export function BadgeItem({ label, detail, tone = "progress" }: BadgeItemProps) {
  return (
    <li className="flex items-start gap-3 py-2.5">
      <span className={`mt-0.5 grid size-7 shrink-0 place-items-center rounded-md ${TONES[tone]}`}>
        <StarGlyph className="size-4" />
      </span>
      <span className="flex flex-col">
        <span className="font-semibold">{label}</span>
        <span className="text-sm text-ink-soft">{detail}</span>
      </span>
    </li>
  );
}
