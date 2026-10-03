import Link from "next/link";
import { buttonClass } from "@/components/ui/button";
import { cardClass } from "@/components/ui/card";
import { SESSION_MINUTES } from "@/engine/pace";
import { BLOCK_IDS, BLOCKS } from "@/session/blocks";
import { SiteHeader } from "@/components/site-header";

/** The five blocks as a ruler of the session's thirty minutes, each as wide as it is long. */
function SessionRuler() {
  return (
    <ol
      aria-label="The five blocks of a session"
      className="grid gap-x-1.5 sm:gap-x-2"
      style={{
        gridTemplateColumns: BLOCK_IDS.map((id) => `${BLOCKS[id].minutes}fr`).join(" "),
      }}
    >
      {BLOCK_IDS.map((id, index) => (
        <li key={id} className="flex min-w-0 flex-col gap-3">
          <span
            aria-hidden="true"
            className={`h-2.5 rounded-full ${index % 2 === 0 ? "bg-primary" : "bg-primary/55"}`}
          />
          <span className="flex flex-col gap-0.5">
            <span className="font-display text-sm leading-tight font-semibold sm:text-lg">
              {BLOCKS[id].label}
            </span>
            <span className="text-xs text-ink-soft tabular-nums sm:text-sm">
              {BLOCKS[id].minutes} min
            </span>
          </span>
        </li>
      ))}
    </ol>
  );
}

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main
        id="main"
        className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-20 px-6 py-16 sm:py-24"
      >
        <section className="flex max-w-3xl flex-col gap-6">
          <h1 className="font-display text-4xl leading-[1.05] font-bold tracking-tight sm:text-5xl">
            We don&apos;t carry anyone. We give them a foothold.
          </h1>
          <p className="max-w-xl text-lg text-ink-soft">
            AI that does the work carries kids up the mountain, and the test is where they fall.
            Foothold AI makes them do the climbing: thirty-minute sessions on a schedule the parent
            sets, a coach that never gives the answer, and a record of what the kid can explain.
          </p>
          <div className="flex flex-wrap items-center gap-5">
            <Link href="/onboarding" className={buttonClass("primary")}>
              Set up your child&apos;s plan
            </Link>
            <Link href="/student" className="link">
              See today&apos;s session
            </Link>
          </div>
        </section>

        <section aria-labelledby="session-heading" className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <h2 id="session-heading" className="font-display text-2xl font-semibold tracking-tight">
              A session is {SESSION_MINUTES} minutes, in five blocks
            </h2>
            <p className="max-w-xl text-ink-soft">
              Algebra 1 first, for grades 6 to 10. Every kid gets the same math; the word problems
              are written in the kid&apos;s own interests.
            </p>
          </div>
          <SessionRuler />
        </section>

        <section className={`${cardClass("today")} flex flex-col gap-3 sm:p-8`}>
          <h2 className="font-display text-2xl font-semibold tracking-tight">
            Set it once. We hold them to it.
          </h2>
          <p className="max-w-2xl text-ink-soft">
            You pick the days and the time. On a session day the games and social apps wait until
            the session is done, and you hear the same day if it was skipped. Each session ends with
            your kid explaining the math in their own words, and that explanation is yours to read.
          </p>
        </section>
      </main>
    </>
  );
}
