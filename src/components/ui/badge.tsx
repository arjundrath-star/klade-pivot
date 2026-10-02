import type { ComponentPropsWithoutRef } from "react";
import { TINT_BG, TINT_TEXT, type Tint } from "./tints";

type BadgeTone = "success" | "outline" | Tint;

function toneClass(tone: BadgeTone): string {
  switch (tone) {
    case "success":
      return "bg-success-tint text-success";
    case "outline":
      return "text-ink-soft ring-1 ring-line-strong";
    default:
      return `${TINT_BG[tone]} ${TINT_TEXT[tone]}`;
  }
}

interface BadgeProps extends ComponentPropsWithoutRef<"span"> {
  tone?: BadgeTone;
}

/** A small pill that labels a state: a prototype, an unlock, an override. */
export function Badge({ tone = "outline", className = "", ...props }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ${toneClass(tone)} ${className}`}
      {...props}
    />
  );
}
