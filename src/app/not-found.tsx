import { buttonClass } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";

/**
 * What a wrong address gets: where things are, in the app's own frame. Plain anchors, so the
 * page adds no client code to any route.
 */
export default function NotFound() {
  return (
    <main id="main" className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-16">
      <PageHeader title="There is nothing at this address">
        <p>
          The page may have moved, or the link was typed wrong. Today&apos;s session is on the
          student&apos;s page; a parent&apos;s view is behind the parent sign-in.
        </p>
      </PageHeader>
      <div className="flex flex-wrap items-center gap-5">
        <a href="/student" className={buttonClass("primary")}>
          Go to today&apos;s session
        </a>
        <a href="/parent" className="link">
          Open the parent view
        </a>
      </div>
    </main>
  );
}
