import type { ComponentProps, ReactNode } from "react";
import { PhoneSlot } from "./phone-slot";

interface PhoneSectionProps extends ComponentProps<typeof PhoneSlot> {
  heading: string;
  /** What the page says beside or under the phone. */
  children: ReactNode;
}

/**
 * The phone with its heading and caption, on the parent's and the student's views. The caption
 * sits beside the phone when the section has the room, else under it, by the section's own width.
 */
export function PhoneSection({ heading, children, ...phone }: PhoneSectionProps) {
  return (
    <section aria-labelledby="phone-heading" className="@container">
      <div className="flex flex-col items-center gap-6 @md:flex-row @md:items-start @md:gap-8">
        <div className="flex w-full max-w-[268px] flex-col gap-3 text-center @md:order-last @md:max-w-none @md:pt-4 @md:text-left">
          <h2 id="phone-heading" className="font-display text-xl font-semibold tracking-tight">
            {heading}
          </h2>
          {children}
        </div>
        <PhoneSlot {...phone} />
      </div>
    </section>
  );
}
