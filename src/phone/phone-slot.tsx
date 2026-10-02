"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";

// The screen loads as its own chunk after the page, so no route's first load carries it.
const PhonePanel = dynamic(() => import("./phone-panel").then((m) => m.PhonePanel), {
  ssr: false,
  loading: () => <div className="h-full rounded-2xl bg-night" />,
});

/** The phone's body, drawn at its full size before the screen inside it loads. */
export function PhoneSlot(props: ComponentProps<typeof PhonePanel>) {
  return (
    <div className="relative h-[548px] w-[268px] shrink-0 rounded-[2.6rem] bg-[#26262b] p-2.5 shadow-phone">
      <span
        aria-hidden="true"
        className="absolute top-28 -left-[3px] h-9 w-[3px] rounded-l bg-[#4a4a52]"
      />
      <span
        aria-hidden="true"
        className="absolute top-40 -left-[3px] h-9 w-[3px] rounded-l bg-[#4a4a52]"
      />
      <span
        aria-hidden="true"
        className="absolute top-32 -right-[3px] h-14 w-[3px] rounded-r bg-[#4a4a52]"
      />
      <PhonePanel {...props} />
    </div>
  );
}
