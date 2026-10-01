"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import type { AdminNotice } from "./notices";
import { resetDemoData } from "@/db/demo";
import { lockSettings, resetDemoClock } from "@/db/queries/lock";
import { setInterests } from "@/db/queries/students";
import { INTERESTS } from "@/engine/types";
import { gatedFamily } from "@/gate/server";
import { calendarDay, familyMoment } from "@/parent/progress";
import { markTodayMissed } from "@/session/alerts";
import { forgetStudent } from "@/session/current-student";
import { demoClockFor } from "@/session/lock";
import { lockView } from "@/session/lock-status";
import { overrideExplainBack } from "@/session/override";

// Every action acts for the family the gate lets this browser act for: the demo family.

const ADMIN = "/admin";

function backToAdmin(notice: AdminNotice): never {
  redirect(`${ADMIN}?notice=${notice}`);
}

/** Marks today's scheduled session missed, raises the alert and updates the behind count. */
export async function simulateMissedSession(): Promise<void> {
  const { studentId } = await gatedFamily(ADMIN);
  const result = await markTodayMissed(studentId);
  backToAdmin(result.ok ? "missed" : result.error);
}

const InterestInput = z.object({ interest: z.enum(INTERESTS) });

/** Makes one interest the student's only one. The next rendered word problem is framed in it. */
export async function switchInterest(formData: FormData): Promise<void> {
  const { studentId } = await gatedFamily(ADMIN);
  const parsed = InterestInput.safeParse({ interest: formData.get("interest") });
  if (!parsed.success) backToAdmin("invalid");
  const updated = await setInterests(studentId, [parsed.data.interest]);
  backToAdmin(updated ? "interest" : "not-found");
}

/** Passes the open session's explain-back without grading. A demo safety valve. */
export async function overrideExplanation(): Promise<void> {
  const { studentId } = await gatedFamily(ADMIN);
  const result = await overrideExplainBack(studentId);
  backToAdmin(result.ok ? "override" : result.error);
}

/**
 * Sets the phone's demo clock to the latest session day, just after the rule starts, so the panel
 * locks whatever the real day and hour. Drops tonight's unlock, so the demo starts locked.
 */
export async function simulateSessionDay(): Promise<void> {
  const { familyId, studentId } = await gatedFamily(ADMIN);
  const settings = await lockSettings(familyId, studentId);
  if (!settings) backToAdmin("not-found");
  const { day, time } = demoClockFor(settings.rule, settings, calendarDay(new Date()));
  const set = await resetDemoClock(familyId, familyMoment(day, time));
  if (!set) backToAdmin("not-found");
  const { reason } = await lockView(studentId);
  backToAdmin(reason === "session-done" ? "clock-done" : "clock");
}

/**
 * Puts the whole demo back to its seeded state: Maya with no history, today on her schedule, her
 * phone rule on, the real clock and no unlock. This browser acts as Maya again, in case it
 * onboarded a family during the run.
 */
export async function resetDemo(): Promise<void> {
  await gatedFamily(ADMIN);
  await resetDemoData();
  await forgetStudent();
  backToAdmin("reset");
}
