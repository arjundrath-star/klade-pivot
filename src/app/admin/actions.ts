"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import type { AdminNotice } from "./notices";
import { DEMO_STUDENT_ID } from "@/db/demo";
import { setInterests } from "@/db/queries/students";
import { INTERESTS } from "@/engine/types";
import { markTodayMissed } from "@/session/alerts";
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
