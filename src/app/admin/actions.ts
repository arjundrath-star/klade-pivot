"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import type { AdminNotice } from "./notices";
import { DEMO_FAMILY_ID, DEMO_STUDENT_ID } from "@/db/demo";
import { lockSettings, resetDemoClock } from "@/db/queries/lock";
import { setInterests } from "@/db/queries/students";
import { INTERESTS } from "@/engine/types";
import { calendarDay, familyMoment } from "@/parent/progress";
import { markTodayMissed } from "@/session/alerts";
import { demoClockFor } from "@/session/lock";
import { lockView } from "@/session/lock-status";
import { overrideExplainBack } from "@/session/override";

// Sign-in is not built yet, so every admin action acts on the demo student.

function backToAdmin(notice: AdminNotice): never {
  redirect(`/admin?notice=${notice}`);
}

/** Marks today's scheduled session missed, raises the alert and updates the behind count. */
export async function simulateMissedSession(): Promise<void> {
  const result = await markTodayMissed(DEMO_STUDENT_ID);
  backToAdmin(result.ok ? "missed" : result.error);
}

const InterestInput = z.object({ interest: z.enum(INTERESTS) });

/** Makes one interest the student's only one. The next rendered word problem is framed in it. */
export async function switchInterest(formData: FormData): Promise<void> {
  const parsed = InterestInput.safeParse({ interest: formData.get("interest") });
  if (!parsed.success) backToAdmin("invalid");
  const updated = await setInterests(DEMO_STUDENT_ID, [parsed.data.interest]);
  backToAdmin(updated ? "interest" : "not-found");
}

/** Passes the open session's explain-back without grading. A demo safety valve. */
export async function overrideExplanation(): Promise<void> {
  const result = await overrideExplainBack(DEMO_STUDENT_ID);
  backToAdmin(result.ok ? "override" : result.error);
}

/**
 * Sets the phone's demo clock to the latest session day, just after the rule starts, so the panel
 * locks whatever the real day and hour. Drops tonight's unlock, so the demo starts locked.
 */
export async function simulateSessionDay(): Promise<void> {
  const settings = await lockSettings(DEMO_FAMILY_ID, DEMO_STUDENT_ID);
  if (!settings) backToAdmin("not-found");
  const { day, time } = demoClockFor(settings.rule, settings, calendarDay(new Date()));
  const set = await resetDemoClock(DEMO_FAMILY_ID, familyMoment(day, time));
  if (!set) backToAdmin("not-found");
  const { reason } = await lockView(DEMO_STUDENT_ID);
  backToAdmin(reason === "session-done" ? "clock-done" : "clock");
}

/** Puts the phone back on the real clock and drops tonight's unlock. */
export async function resetDemo(): Promise<void> {
  const cleared = await resetDemoClock(DEMO_FAMILY_ID, null);
  backToAdmin(cleared ? "reset" : "not-found");
}
