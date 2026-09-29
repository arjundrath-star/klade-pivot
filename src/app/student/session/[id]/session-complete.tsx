import Link from "next/link";

export function SessionComplete({ title }: { title: string }) {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold tracking-tight">Session done</h1>
      <p className="text-zinc-600 dark:text-zinc-400">You finished {title}.</p>
      <Link href="/student" className="font-medium underline underline-offset-4">
        Back to today
      </Link>
    </div>
  );
}
