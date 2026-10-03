"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import type { AdminNotice } from "./notices";
import { resetDemoData } from "@/db/demo";
import { lockSettings, resetDemoClock } from "@/db/queries/lock";
import { setInterests } from "@/db/queries/students";
import { INTERESTS } from "@/engine/types";
import { gatedFamily } from "@/gate/server";
import { calendarDay } from "@/parent/progress";
import { markTodayMissed } from "@/session/alerts";
import { forgetStudent } from "@/session/current-student";
import { demoClockMoment } from "@/session/lock";
import { lockView } from "@/session/lock-status";
import { overrideExplainBack } from "@/session/override";

// Every action acts for the family the gate lets this browser act for: the demo family.

const ADMIN = "/admin";

/**
 * The pages an action can come back to: the admin panel, or the student screens that carry the
 * admin ribbon. Anything else, including a path on another site, goes back to the panel.
 */
const SESSION_PATH = "/student/session/";

const BackPath = z.union([
  z.literal(ADMIN),
  z.literal("/student"),
  z
    .string()
    .refine(
      (path) =>
        path.startsWith(SESSION_PATH) &&
        z.uuid().safeParse(path.slice(SESSION_PATH.length)).success,
    ),
]);

/** Redirects to the page the form named in its `back` field, else the admin panel, with the notice. */
function backWith(formData: FormData | undefined, notice: AdminNotice): never {
  const back = BackPath.safeParse(formData?.get("back"));
  redirect(`${back.success ? back.data : ADMIN}?notice=${notice}`);
}

/** Marks today's scheduled session missed, raises the alert and updates the behind count. */
export async function simulateMissedSession(formData?: FormData): Promise<void> {
  const { studentId } = await gatedFamily(ADMIN);
  const result = await markTodayMissed(studentId);
  backWith(formData, result.ok ? "missed" : result.error);
}

const InterestInput = z.object({ interest: z.enum(INTERESTS) });

/** Makes one interest the student's only one. The next rendered word problem is framed in it. */
export async function switchInterest(formData: FormData): Promise<void> {
  const { studentId } = await gatedFamily(ADMIN);
  const parsed = InterestInput.safeParse({ interest: formData.get("interest") });
  if (!parsed.success) backWith(formData, "invalid");
  const updated = await setInterests(studentId, [parsed.data.interest]);
  backWith(formData, updated ? "interest" : "not-found");
}

/** Passes the open session's explain-back without grading. A demo safety valve. */
export async function overrideExplanation(formData?: FormData): Promise<void> {
  const { studentId } = await gatedFamily(ADMIN);
  const result = await overrideExplainBack(studentId);
  backWith(formData, result.ok ? "override" : result.error);
}

/**
 * Sets the phone's demo clock to the latest session day, just after the rule starts, so the panel
 * locks whatever the real day and hour. Drops tonight's unlock, so the demo starts locked.
 */
export async function simulateSessionDay(formData?: FormData): Promise<void> {
  const { familyId, studentId } = await gatedFamily(ADMIN);
  const settings = await lockSettings(familyId, studentId);
  if (!settings) backWith(formData, "not-found");
  const at = demoClockMoment(settings.rule, settings, calendarDay(new Date()));
  const set = await resetDemoClock(familyId, at);
  if (!set) backWith(formData, "not-found");
  const { reason } = await lockView(studentId);
  backWith(formData, reason === "session-done" ? "clock-done" : "clock");
}

/**
 * Puts the whole demo back to its seeded state: Maya with her record of the concepts before
 * two-step equations, today on her schedule, her phone rule on, the real clock and no unlock.
 * This browser acts as Maya again, in case it onboarded a family during the run.
 */
export async function resetDemo(formData?: FormData): Promise<void> {
  await gatedFamily(ADMIN);
  await resetDemoData();
  await forgetStudent();
  backWith(formData, "reset");
}
