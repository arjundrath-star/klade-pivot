export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-24">
      <div className="w-full max-w-2xl">
        <p className="mb-6 text-sm font-medium tracking-wide text-zinc-500 uppercase">
          Klade · Algebra 1
        </p>
        <h1 className="text-4xl leading-tight font-semibold tracking-tight sm:text-5xl">
          Every kid has an AI that does the work for them. We built one that makes them do it.
        </h1>
        <p className="mt-6 max-w-xl text-lg leading-relaxed text-zinc-600 dark:text-zinc-400">
          Thirty-minute sessions on a schedule the parent sets. A same-day alert when one is
          skipped. A coach that never gives the answer, and a record of what the kid can explain.
        </p>
      </div>
    </main>
  );
}
