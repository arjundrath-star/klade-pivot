import Link from "next/link";
import type { AdminControls } from "./controls";
import {
  resetDemo,
  simulateMissedSession,
  simulateSessionDay,
  switchInterest,
} from "@/app/admin/actions";
import { ADMIN_NOTICES, NoticeParam } from "@/app/admin/notices";
import { INTEREST_LABELS } from "@/content/interests";
import { INTERESTS } from "@/engine/types";

const BUTTON =
  "rounded-full bg-white/12 px-3 py-1 font-medium text-white hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marigold";

const LINK = "underline underline-offset-4 hover:text-marigold";

interface AdminRibbonProps {
  /** From `adminControls`: null for a browser not signed in at the gate, which gets no ribbon. */
  controls: AdminControls | null;
  /** The page the ribbon is on, which its actions come back to with their notice. */
  back: string;
  /** The page's `notice` query parameter, as an action left it. */
  notice: string | string[] | undefined;
}

function RibbonAction({
  action,
  back,
  label,
}: {
  action: (formData: FormData) => Promise<void>;
  back: string;
  label: string;
}) {
  return (
    <form action={action}>
      <input type="hidden" name="back" value={back} />
      <button type="submit" className={BUTTON}>
        {label}
      </button>
    </form>
  );
}

/**
 * The admin panel's demo controls as a thin bar on the student's screens, so the demo can be
 * driven without leaving the student view. Rendered only with `controls`, which a page gets for a
 * browser signed in at the gate; every action checks the gate again. Server-rendered forms.
 */
export function AdminRibbon({ controls, back, notice }: AdminRibbonProps) {
  if (!controls) return null;
  const shown = NoticeParam.safeParse(notice);
  return (
    <div
      role="region"
      aria-label="Admin"
      className="flex flex-col gap-2 rounded-xl bg-dusk px-4 py-2 text-sm text-white"
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="mr-1 font-semibold text-marigold">Admin</span>
        <RibbonAction action={simulateMissedSession} back={back} label="Simulate missed session" />
        <RibbonAction action={simulateSessionDay} back={back} label={controls.clockLabel} />
        <form action={switchInterest} className="flex items-center gap-2">
          <input type="hidden" name="back" value={back} />
          <label htmlFor="ribbon-interest" className="sr-only">
            Interest
          </label>
          <select
            id="ribbon-interest"
            name="interest"
            defaultValue={controls.interests[0]}
            className="rounded-full bg-white/12 px-2.5 py-1 text-white"
          >
            {INTERESTS.map((interest) => (
              <option key={interest} value={interest} className="text-dusk">
                {INTEREST_LABELS[interest]}
              </option>
            ))}
          </select>
          <button type="submit" className={BUTTON}>
            Switch interest
          </button>
        </form>
        <RibbonAction action={resetDemo} back="/student" label="Reset demo" />
        <Link href="/parent" className={LINK}>
          Parent view
        </Link>
        <Link href="/admin" className={LINK}>
          Admin panel
        </Link>
      </div>
      {shown.success && (
        <p role="status" className="text-white/85">
          {ADMIN_NOTICES[shown.data]}
        </p>
      )}
    </div>
  );
}
