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
      <header className="flex flex-col gap-2">
        <h1 className="font-display text-3xl font-bold tracking-tight">Set up Algebra 1</h1>
        <p className="text-ink-soft">
          Six short steps. You set the pace, the days and the phone rule once; the plan takes it
          from there.
        </p>
      </header>
      <OnboardingForm today={calendarDay(now)} defaultTarget={nextMay(now)} />
    </div>
  );
}
