import Link from "next/link";
import { buttonClass } from "@/components/ui/button";

/** What a page says when there is no student yet. The student's pages offer onboarding. */
export function NoStudent({ onboarding = false }: { onboarding?: boolean }) {
  return (
    <div className="flex max-w-prose flex-col gap-4">
      <p className="text-ink-soft">
        {onboarding
          ? "No student on this device yet. A parent sets up the plan once; the sessions start from there."
          : "No student yet. A parent sets one up from the home page, and this view fills in from the first session."}
      </p>
      {onboarding && (
        <Link href="/onboarding" className={`${buttonClass("primary")} self-start`}>
          Set up your child&apos;s plan
        </Link>
      )}
    </div>
  );
}
