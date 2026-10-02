import { cardClass } from "@/components/ui/card";
import { StarGlyph } from "@/components/ui/glyphs";

interface BadgeItemProps {
  label: string;
  detail: string;
  /** On the shelf the item sits on the progress tint; on the end screen, on white. */
  surface?: "tint" | "white";
}

/** One earned badge: a star in the progress color, its name and what earned it. */
export function BadgeItem({ label, detail, surface = "tint" }: BadgeItemProps) {
  return (
    <li
      className={`${cardClass("progress", "none")} flex items-start gap-3 rounded-md px-3.5 py-2.5 ${
        surface === "white" ? "bg-white" : ""
      }`}
    >
      <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-progress text-ink">
        <StarGlyph className="size-4" />
      </span>
      <span className="flex flex-col">
        <span className="font-semibold">{label}</span>
        <span className="text-sm text-ink-soft">{detail}</span>
      </span>
    </li>
  );
}
