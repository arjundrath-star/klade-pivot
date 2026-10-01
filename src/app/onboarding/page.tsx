import type { Metadata } from "next";
import { connection } from "next/server";
import { OnboardingForm } from "./onboarding-form";
import { nextMay } from "@/db/demo";
import { calendarDay } from "@/parent/progress";

export const metadata: Metadata = { title: "Set up · Klade" };

export default async function OnboardingPage() {
  // The plan starts today, so the page renders per request, never at build time.
  await connection();
  const now = new Date();
  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-3xl font-semibold tracking-tight">Set up Algebra 1</h1>
      <OnboardingForm today={calendarDay(now)} defaultTarget={nextMay(now)} />
    </div>
  );
}
