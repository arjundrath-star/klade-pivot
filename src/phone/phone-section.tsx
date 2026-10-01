import type { ComponentProps, ReactNode } from "react";
import { PhoneSlot } from "./phone-slot";

interface PhoneSectionProps extends ComponentProps<typeof PhoneSlot> {
  heading: string;
  /** What the page says beside the phone. */
  children: ReactNode;
}

/** The phone beside its heading and caption, on the parent's and the student's views. */
export function PhoneSection({ heading, children, ...phone }: PhoneSectionProps) {
  return (
    <section
      aria-labelledby="phone-heading"
      className="flex flex-col items-center gap-8 sm:flex-row sm:items-start"
    >
      <div className="flex flex-col gap-3 sm:order-last sm:pt-4">
        <h2 id="phone-heading" className="text-xl font-semibold">
          {heading}
        </h2>
        {children}
      </div>
      <PhoneSlot {...phone} />
    </section>
  );
}
