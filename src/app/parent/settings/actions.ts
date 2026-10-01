"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import type { SettingsNotice } from "./notices";
import { saveLockRule, setLockEnabled, setLockOverride } from "@/db/queries/lock";
import { addDays } from "@/engine/pace";
import { gatedFamily } from "@/gate/server";
import { LockRuleInput } from "@/onboarding/schema";
import { calendarDay, familyMoment } from "@/parent/progress";
import { ruleFromForm } from "@/phone/rule-fields";

// Every write is for the family the gate lets this browser act for, and each query checks the
// student belongs to that family.

const SETTINGS = "/parent/settings";

function backToSettings(notice: SettingsNotice): never {
  redirect(`${SETTINGS}?notice=${notice}`);
}

/** Creates the phone rule, switched on, or saves the edited one. */
export async function saveRule(formData: FormData): Promise<void> {
  const { familyId, studentId } = await gatedFamily(SETTINGS);
  const parsed = LockRuleInput.safeParse(ruleFromForm(formData));
  if (!parsed.success) backToSettings("invalid");
  const saved = await saveLockRule(familyId, studentId, parsed.data);
  backToSettings(saved ? "saved" : "not-found");
}

const SwitchInput = z.strictObject({ enabled: z.enum(["on", "off"]) });

/** The master switch. */
export async function switchRule(formData: FormData): Promise<void> {
  const { familyId, studentId } = await gatedFamily(SETTINGS);
  const parsed = SwitchInput.safeParse({ enabled: formData.get("enabled") });
  if (!parsed.success) backToSettings("invalid");
  const on = parsed.data.enabled === "on";
  const changed = await setLockEnabled(familyId, studentId, on);
  backToSettings(changed ? parsed.data.enabled : "no-rule");
}

/** "Unlock tonight": nothing locks until the family's midnight. */
export async function unlockTonight(): Promise<void> {
  const { familyId, studentId } = await gatedFamily(SETTINGS);
  const midnight = familyMoment(addDays(calendarDay(new Date()), 1), "00:00");
  const changed = await setLockOverride(familyId, studentId, midnight);
  backToSettings(changed ? "unlocked" : "no-rule");
}
