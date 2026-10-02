import Link from "next/link";

/** What a page says when there is no student yet. The student's pages offer onboarding. */
export function NoStudent({ onboarding = false }: { onboarding?: boolean }) {
  return (
    <p>
      No student yet.{" "}
      {onboarding && (
        <>
          <Link href="/onboarding" className="link">
            Set one up
          </Link>
          , or run
        </>
      )}
      {!onboarding && "Run"} npm run db:seed to add the demo student.
    </p>
  );
}
