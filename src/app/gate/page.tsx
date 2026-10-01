import type { Metadata } from "next";
import Link from "next/link";
import { z } from "zod";
import { NextPath } from "@/gate/next-path";
import { GATE_NOTICE_KEYS, GATE_NOTICES } from "@/gate/notices";

export const metadata: Metadata = { title: "Sign in · Klade" };

const Params = z.object({
  next: NextPath.catch("/admin"),
  notice: z.enum(GATE_NOTICE_KEYS).optional().catch(undefined),
});

/**
 * The shared-password gate in front of the parent and admin views. The form posts to
 * /gate/enter, which sets the cookie the proxy checks and sends the browser on to `next`.
 */
export default async function Gate({ searchParams }: PageProps<"/gate">) {
  const { next, notice } = Params.parse(await searchParams);

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-8 px-6 py-12">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">Parent and admin views</h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          These pages are for the demo&apos;s parent and admin. Enter the shared password to open
          them in this browser.
        </p>
      </header>

      {notice && (
        <p role="alert" className="rounded-md bg-zinc-100 px-4 py-3 dark:bg-zinc-900">
          {GATE_NOTICES[notice]}
        </p>
      )}

      <form action="/gate/enter" method="post" className="flex flex-col gap-4">
        <input type="hidden" name="next" value={next} />
        <label className="flex flex-col gap-1">
          <span className="font-medium">Password</span>
          <input
            type="password"
            name="password"
            required
            maxLength={200}
            autoComplete="current-password"
            autoFocus
            className="rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950"
          />
        </label>
        <div>
          <button type="submit" className="btn-primary">
            Enter
          </button>
        </div>
      </form>

      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        The student&apos;s pages need no password.{" "}
        <Link href="/student" className="underline underline-offset-2">
          Go to today&apos;s session
        </Link>
        .
      </p>
    </main>
  );
}
