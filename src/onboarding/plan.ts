import { ALGEBRA1_COURSE } from "@/content/algebra1/course";
import {
  ALGEBRA1_SESSION_ESTIMATE,
  daysBetween,
  planPace,
  type PacePreset,
  type PaceResult,
} from "@/engine/pace";

/** A target more than two years out is a typo, not a plan. */
export const MAX_TARGET_DAYS = 730;

export type Algebra1Plan = PaceResult | { ok: false; error: "target-too-far" };

/**
 * The Algebra 1 plan from `start` to `target` at a preset pace. The onboarding form previews it and
 * the server checks it again, so both use this one function.
 */
export function planAlgebra1(start: string, target: string, preset: PacePreset): Algebra1Plan {
  if (daysBetween(start, target) > MAX_TARGET_DAYS) return { ok: false, error: "target-too-far" };
  return planPace({
    totalSessions: ALGEBRA1_SESSION_ESTIMATE,
    units: ALGEBRA1_COURSE,
    start,
    target,
    pace: { preset },
  });
}
