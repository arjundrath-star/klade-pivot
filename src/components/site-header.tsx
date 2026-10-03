import { Wordmark } from "./wordmark";

/** The top of the pages outside the student and parent shells: the wordmark alone. */
export function SiteHeader() {
  return (
    <header className="mx-auto flex w-full max-w-7xl items-center px-6 pt-5">
      <Wordmark />
    </header>
  );
}
