import type { ComponentPropsWithoutRef } from "react";

/**
 * primary: the one action a screen is about, in the primary accent. secondary: an outlined action
 * beside it.
 */
type ButtonVariant = "primary" | "secondary";
type ButtonSize = "md" | "sm";

const BASE =
  "focus-ring inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-colors active:translate-y-px disabled:cursor-not-allowed disabled:opacity-45";

/** Small buttons keep a 44px target on a phone and shrink from the first breakpoint. */
const SIZES: Readonly<Record<ButtonSize, string>> = {
  md: "min-h-11 px-5 py-2.5 text-base",
  sm: "min-h-11 px-3.5 py-1.5 text-sm sm:min-h-9",
};

const VARIANTS: Readonly<Record<ButtonVariant, string>> = {
  primary: "bg-primary text-white hover:bg-primary-deep",
  secondary: "border border-line-strong bg-white text-ink hover:border-ink hover:bg-well",
};

/** The button's classes, for links and other elements that look like a button. */
export function buttonClass(variant: ButtonVariant = "primary", size: ButtonSize = "md"): string {
  return `${BASE} ${SIZES[size]} ${VARIANTS[variant]}`;
}

interface ButtonProps extends ComponentPropsWithoutRef<"button"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export function Button({
  variant = "primary",
  size = "md",
  type = "button",
  className = "",
  ...props
}: ButtonProps) {
  return <button type={type} className={`${buttonClass(variant, size)} ${className}`} {...props} />;
}
