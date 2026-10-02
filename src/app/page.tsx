import Link from "next/link";
import { buttonClass } from "@/components/ui/button";
import { cardClass } from "@/components/ui/card";
import { SESSION_MINUTES } from "@/engine/pace";
import { BLOCK_IDS, BLOCKS } from "@/session/blocks";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-16 px-6 py-16 sm:py-24">
      <section className="flex max-w-3xl flex-col gap-6">
        <p className="text-sm font-semibold text-today-deep">Algebra 1, for grades 6 to 10</p>
        <h1 className="font-display text-4xl leading-tight font-bold tracking-tight sm:text-5xl">
          Every kid has an AI that does the work for them. We built one that makes them do it.
        </h1>
        <p className="max-w-xl text-lg text-ink-soft">
          Thirty-minute sessions on a schedule the parent sets. A same-day alert when one is
          skipped. A coach that never gives the answer, and a record of what the kid can explain.
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

      <section aria-labelledby="session-heading" className="flex flex-col gap-5">
        <h2 id="session-heading" className="font-display text-2xl font-semibold tracking-tight">
          One session is {SESSION_MINUTES} minutes, in five blocks
        </h2>
        <ol className="grid gap-3 sm:grid-cols-5">
          {BLOCK_IDS.map((id, index) => (
            <li key={id} className={`${cardClass("primary", "xs")} flex flex-col gap-2`}>
              <span className="grid size-7 place-items-center rounded-full bg-primary font-display text-sm font-semibold text-white">
                {index + 1}
              </span>
              <span className="font-display text-lg leading-tight font-semibold">
                {BLOCKS[id].label}
              </span>
              <span className="text-sm text-ink-soft">{BLOCKS[id].minutes} minutes</span>
            </li>
          ))}
        </ol>
      </section>

      <section className={`${cardClass("today")} flex flex-col gap-3 sm:p-8`}>
        <p className="font-display text-2xl font-semibold tracking-tight">
          Set it once. We hold them to it.
        </p>
        <p className="max-w-2xl text-ink-soft">
          You pick the days and the time. On a session day the games and social apps wait until the
          session is done, and you hear the same day if it was skipped. Each session ends with your
          kid explaining the math in their own words, and that explanation is yours to read.
        </p>
      </section>
    </main>
  );
}
