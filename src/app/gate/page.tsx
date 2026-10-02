import type { Metadata } from "next";
import Link from "next/link";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, inputClass } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
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
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 px-6 py-12">
      <header className="flex flex-col gap-2">
        <h1 className="font-display text-3xl font-bold tracking-tight">Parent and admin views</h1>
        <p className="text-ink-soft">
          These pages are for the demo&apos;s parent and admin. Enter the shared password to open
          them in this browser.
        </p>
      </header>

      {notice && <Notice role="alert">{GATE_NOTICES[notice]}</Notice>}

      <Card>
        <form action="/gate/enter" method="post" className="flex flex-col gap-5">
          <input type="hidden" name="next" value={next} />
          <Field id="gate-password" label="Password">
            <input
              id="gate-password"
              type="password"
              name="password"
              required
              maxLength={200}
              autoComplete="current-password"
              autoFocus
              className={`${inputClass} w-full`}
            />
          </Field>
          <div>
            <Button type="submit">Enter</Button>
          </div>
        </form>
      </Card>

      <p className="text-sm text-ink-soft">
        The student&apos;s pages need no password.{" "}
        <Link href="/student" className="link">
          Go to today&apos;s session
        </Link>
        .
      </p>
    </main>
  );
}
