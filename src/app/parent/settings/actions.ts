"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import type { SettingsNotice } from "./notices";
import { DEMO_FAMILY_ID, DEMO_STUDENT_ID } from "@/db/demo";
import { saveLockRule, setLockEnabled, setLockOverride } from "@/db/queries/lock";
import { addDays } from "@/engine/pace";
import { LockRuleInput } from "@/onboarding/schema";
import { calendarDay, familyMoment } from "@/parent/progress";
import { ruleFromForm } from "@/phone/rule-fields";

// Sign-in is not built yet, so every settings write is for the demo family's student, and each
// query checks the student belongs to that family.

function backToSettings(notice: SettingsNotice): never {
  redirect(`/parent/settings?notice=${notice}`);
}

/** Creates the phone rule, switched on, or saves the edited one. */
export async function saveRule(formData: FormData): Promise<void> {
  const parsed = LockRuleInput.safeParse(ruleFromForm(formData));
  if (!parsed.success) backToSettings("invalid");
  const saved = await saveLockRule(DEMO_FAMILY_ID, DEMO_STUDENT_ID, parsed.data);
  backToSettings(saved ? "saved" : "not-found");
}

const SwitchInput = z.strictObject({ enabled: z.enum(["on", "off"]) });

/** The master switch. */
export async function switchRule(formData: FormData): Promise<void> {
  const parsed = SwitchInput.safeParse({ enabled: formData.get("enabled") });
  if (!parsed.success) backToSettings("invalid");
  const on = parsed.data.enabled === "on";
  const changed = await setLockEnabled(DEMO_FAMILY_ID, DEMO_STUDENT_ID, on);
  backToSettings(changed ? parsed.data.enabled : "no-rule");
}

/** "Unlock tonight": nothing locks until the family's midnight. */
export async function unlockTonight(): Promise<void> {
  const midnight = familyMoment(addDays(calendarDay(new Date()), 1), "00:00");
  const changed = await setLockOverride(DEMO_FAMILY_ID, DEMO_STUDENT_ID, midnight);
  backToSettings(changed ? "unlocked" : "no-rule");
}
