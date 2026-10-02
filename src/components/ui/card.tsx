import type { ComponentPropsWithoutRef } from "react";
import { TINT_BG, TINT_BORDER, type Tint } from "./tints";

/**
 * surface: a white card with a hairline, the page's working unit. well: a lighter block inset in
 * a tinted card. A tint: the feature's soft color, for the card a page is about.
 */
type CardTone = "surface" | "well" | Tint;

/** md for a card on the page, sm for a tile, xs for a list item, none when the caller pads it. */
type CardPadding = "md" | "sm" | "xs" | "none";

const PADDING: Readonly<Record<CardPadding, string>> = {
  md: "p-6",
  sm: "p-5",
  xs: "p-4",
  none: "",
};

/** The card's classes, for articles, list items and other elements that are cards. */
export function cardClass(tone: CardTone = "surface", padding: CardPadding = "md"): string {
  const pad = PADDING[padding];
  if (tone === "surface") return `rounded-lg border border-line bg-white ${pad}`;
  if (tone === "well") return `rounded-md bg-white/70 ${pad}`;
  return `rounded-lg border ${TINT_BORDER[tone]} ${TINT_BG[tone]} ${pad}`;
}

interface CardProps extends ComponentPropsWithoutRef<"section"> {
  tone?: CardTone;
  padding?: CardPadding;
}

/** A card as a section; label it with `aria-labelledby` to make it a region. */
export function Card({ tone = "surface", padding = "md", className = "", ...props }: CardProps) {
  return <section className={`${cardClass(tone, padding)} ${className}`} {...props} />;
}
