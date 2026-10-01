import type { Metadata } from "next";
import Link from "next/link";
import { CHECK_IN_MINUTES } from "@/mentor/check-in";

export const metadata: Metadata = { title: "Waiting room · Klade" };

/** Where the check-in's video would start. A static mock: no video, no booking. */
export default function WaitingRoom() {
  return (
    <div className="flex flex-col gap-8">
      <section
        aria-labelledby="waiting-heading"
        className="bg-dusk-glow flex flex-col items-center gap-5 rounded-[1.75rem] px-6 py-14 text-center text-white"
      >
        <span className="relative grid size-20 place-items-center">
          <span
            aria-hidden="true"
            className="absolute inset-0 rounded-full bg-marigold/25 motion-safe:animate-ping"
          />
          <span
            aria-hidden="true"
            className="relative grid size-20 place-items-center rounded-full bg-marigold text-dusk"
          >
            <svg viewBox="0 0 24 24" className="size-9 fill-none stroke-current">
              <rect x="2.5" y="6" width="13" height="12" rx="2.5" strokeWidth="1.8" />
              <path d="m15.5 10.5 6-3.5v10l-6-3.5" strokeWidth="1.8" strokeLinejoin="round" />
            </svg>
          </span>
        </span>
        <h1 id="waiting-heading" className="text-3xl font-semibold tracking-tight">
          Waiting for your mentor
        </h1>
        <p className="max-w-md text-white/80">
          Your mentor lets you in at the check-in time. You&apos;ll explain one problem out loud and
          set this week&apos;s goal together. It takes {CHECK_IN_MINUTES} minutes.
        </p>
        <p className="rounded-full px-3 py-1 text-sm font-medium text-white/85 ring-1 ring-white/25">
          Premium · prototype: there is no video in this demo
        </p>
      </section>
      <section aria-labelledby="rules-heading" className="flex flex-col gap-3">
        <h2 id="rules-heading" className="text-lg font-semibold">
          How check-ins work
        </h2>
        <ul className="flex list-disc flex-col gap-1.5 pl-5 text-zinc-700 dark:text-zinc-300">
          <li>Every check-in happens here in Klade and is recorded.</li>
          <li>A parent can join any check-in.</li>
          <li>Mentors never contact you outside Klade.</li>
        </ul>
      </section>
      <Link href="/student" className="font-medium underline underline-offset-4">
        Back to today
      </Link>
    </div>
  );
}
