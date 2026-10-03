import type { Metadata } from "next";
import { connection } from "next/server";
import { z } from "zod";
import { saveRule, switchRule, unlockTonight } from "./actions";
import { SETTINGS_NOTICE_KEYS, SETTINGS_NOTICES } from "./notices";
import { ParentShell } from "../parent-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Notice } from "@/components/ui/notice";
import { PageHeader } from "@/components/ui/page-header";
import { PanelHeader } from "@/components/ui/panel-header";
import { lockSettings } from "@/db/queries/lock";
import { ruleSummary } from "@/parent/phone-rule";
import { RuleFields } from "@/phone/rule-fields";
import { defaultRule, overrideActive } from "@/session/lock";
import { parentOnPage } from "@/session/current-student";

export const metadata: Metadata = { title: "Phone rule" };

const ROW = "flex flex-wrap items-center justify-between gap-4";

const NoticeParam = z.enum(SETTINGS_NOTICE_KEYS);

export default async function PhoneRuleSettings({ searchParams }: PageProps<"/parent/settings">) {
  // Reads the database, so it renders per request.
  await connection();
  const { familyId, studentId } = await parentOnPage("/parent/settings");
  const [params, settings] = await Promise.all([searchParams, lockSettings(familyId, studentId)]);
  const notice = NoticeParam.safeParse(params.notice);

  return (
    <ParentShell active="/parent/settings" student={settings}>
      {({ name, rule, sessionDays, sessionTime }) => {
        const unlocked = rule !== null && overrideActive(rule, new Date());
        const defaults = rule ?? defaultRule({ sessionDays, sessionTime });
        return (
          <div className="flex max-w-3xl flex-col gap-6">
            <PageHeader title="Phone rule">
              <p>
                {rule
                  ? ruleSummary(rule, name)
                  : `No phone rule yet. Set one and ${name}'s phone locks on session days until the session is done.`}
              </p>
              <p className="text-sm">
                Prototype: the rule runs the phone shown on {name}&apos;s views in this app, not a
                real phone yet.
              </p>
            </PageHeader>

            {notice.success && <Notice role="status">{SETTINGS_NOTICES[notice.data]}</Notice>}

            {rule && (
              <Card aria-labelledby="now-heading" tone="calendar" className="flex flex-col gap-4">
                <PanelHeader id="now-heading" title="Right now" />
                <div className={ROW}>
                  <p>{rule.enabled ? "The rule is on." : "The rule is off. Nothing locks."}</p>
                  <form action={switchRule}>
                    <input type="hidden" name="enabled" value={rule.enabled ? "off" : "on"} />
                    <Button type="submit" variant="secondary">
                      {rule.enabled ? "Turn the rule off" : "Turn the rule on"}
                    </Button>
                  </form>
                </div>
                <div className={`${ROW} border-t border-calendar/40 pt-4`}>
                  {unlocked ? (
                    <p>Unlocked until midnight. The rule is back tomorrow.</p>
                  ) : (
                    <>
                      <p className="max-w-md">
                        Family dinner, a late game? Open {name}&apos;s apps until midnight without
                        the session.
                      </p>
                      <form action={unlockTonight}>
                        <Button type="submit">Unlock tonight</Button>
                      </form>
                    </>
                  )}
                </div>
              </Card>
            )}

            <Card aria-labelledby="rule-heading" className="flex flex-col gap-5">
              <PanelHeader id="rule-heading" title={rule ? "Edit the rule" : "Set the rule"} />
              <form action={saveRule} className="flex flex-col gap-6">
                <RuleFields id="rule" defaults={defaults} name={name} />
                <div>
                  <Button type="submit">Save rule</Button>
                </div>
              </form>
            </Card>
          </div>
        );
      }}
    </ParentShell>
  );
}
