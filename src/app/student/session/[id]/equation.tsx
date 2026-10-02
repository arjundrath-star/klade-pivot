import type { ReactNode } from "react";
import { inputClass } from "@/components/ui/field";

/** The field a student types an answer into: short, in the display face, digits lined up. */
export const answerInputClass = `${inputClass} w-40 font-display text-lg font-semibold tabular-nums`;

const SIZES = { xl: "text-2xl", lg: "text-xl", inline: "text-ink" } as const;

/**
 * An equation the way the student reads it everywhere: in the display face with lined-up digits,
 * large on its own line, or inline at the surrounding size.
 */
export function Equation({
  children,
  size = "xl",
}: {
  children: ReactNode;
  size?: keyof typeof SIZES;
}) {
  const className = `font-display font-semibold tracking-tight tabular-nums ${SIZES[size]}`;
  if (size === "inline") return <span className={className}>{children}</span>;
  return <p className={className}>{children}</p>;
}
