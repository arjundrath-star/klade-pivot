import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { z } from "zod";
import { saveRule, switchRule, unlockTonight } from "./actions";
import { SETTINGS_NOTICE_KEYS, SETTINGS_NOTICES } from "./notices";
import { lockSettings } from "@/db/queries/lock";
import { gatedFamily } from "@/gate/server";
import { ruleSummary } from "@/parent/phone-rule";
import { RuleFields } from "@/phone/rule-fields";
import { defaultRule, overrideActive } from "@/session/lock";

export const metadata: Metadata = { title: "Phone rule · Klade" };

const SECTION = "flex flex-col gap-4 rounded-lg border border-zinc-200 p-6 dark:border-zinc-800";
const HEADING = "text-lg font-semibold";
const MUTED = "text-zinc-600 dark:text-zinc-400";
const ROW = "flex flex-wrap items-center justify-between gap-4";

const NoticeParam = z.enum(SETTINGS_NOTICE_KEYS);

export default async function PhoneRuleSettings({ searchParams }: PageProps<"/parent/settings">) {
  // Reads the database, so it renders per request.
  await connection();
  const { familyId, studentId } = await gatedFamily("/parent/settings");
  const [params, settings] = await Promise.all([searchParams, lockSettings(familyId, studentId)]);
  if (!settings) return <p>No student yet. Run npm run db:seed to add the demo student.</p>;

  const notice = NoticeParam.safeParse(params.notice);
  const { name, rule } = settings;
  const unlocked = rule !== null && overrideActive(rule, new Date());
  const defaults = rule ?? defaultRule(settings);

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <nav aria-label="Views">
          <Link href="/parent" className="underline underline-offset-2">
            {name}&apos;s progress
          </Link>
        </nav>
        <h1 className="text-3xl font-semibold tracking-tight">Phone rule</h1>
        <p className="text-lg">
          {rule
            ? ruleSummary(rule, name)
            : `No phone rule yet. Set one and ${name}'s phone locks on session days until the session is done.`}
        </p>
        <p className={MUTED}>
          Prototype: the rule runs the phone shown on {name}&apos;s views in this app, not a real
          phone yet.
        </p>
      </header>

      {notice.success && (
        <p role="status" className="rounded-md bg-zinc-100 px-4 py-3 dark:bg-zinc-900">
          {SETTINGS_NOTICES[notice.data]}
        </p>
      )}

      {rule && (
        <section aria-labelledby="now-heading" className={SECTION}>
          <h2 id="now-heading" className={HEADING}>
            Right now
          </h2>
          <div className={ROW}>
            <p>{rule.enabled ? "The rule is on." : "The rule is off. Nothing locks."}</p>
            <form action={switchRule}>
              <input type="hidden" name="enabled" value={rule.enabled ? "off" : "on"} />
              <button type="submit" className="btn-secondary">
                {rule.enabled ? "Turn the rule off" : "Turn the rule on"}
              </button>
            </form>
          </div>
          <div className={`${ROW} border-t border-zinc-200 pt-4 dark:border-zinc-800`}>
            {unlocked ? (
              <p>Unlocked until midnight. The rule is back tomorrow.</p>
            ) : (
              <>
                <p className="max-w-md">
                  Family dinner, a late game? Open {name}&apos;s apps until midnight without the
                  session.
                </p>
                <form action={unlockTonight}>
                  <button type="submit" className="btn-primary">
                    Unlock tonight
                  </button>
                </form>
              </>
            )}
          </div>
        </section>
      )}

      <section aria-labelledby="rule-heading" className={SECTION}>
        <h2 id="rule-heading" className={HEADING}>
          {rule ? "Edit the rule" : "Set the rule"}
        </h2>
        <form action={saveRule} className="flex flex-col gap-6">
          <RuleFields id="rule" defaults={defaults} name={name} />
          <div>
            <button type="submit" className="btn-primary">
              Save rule
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
