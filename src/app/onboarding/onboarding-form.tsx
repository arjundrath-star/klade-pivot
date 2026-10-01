"use client";

import { useEffect, useId, useRef, useState, useTransition, type FormEvent } from "react";
import { completeOnboarding, type OnboardingError } from "./actions";
import { FAVORITES, INTEREST_LABELS } from "@/content/interests";
import {
  addDays,
  ALGEBRA1_SESSION_ESTIMATE,
  DEFAULT_SESSION_TIME,
  formatWeeklyTime,
  isCalendarDay,
  MAX_SESSIONS_PER_WEEK,
  PACE_PRESETS,
  PRESET_SESSIONS,
  proposedDays,
  SESSION_MINUTES,
  WEEKDAYS,
  type PacePreset,
  type Weekday,
} from "@/engine/pace";
import { INTERESTS, type Interest } from "@/engine/types";
import { cleanName, GRADES, NAME_MAX } from "@/onboarding/fields";
import { MAX_TARGET_DAYS, planAlgebra1, type Algebra1Plan } from "@/onboarding/plan";
import { formatDate, sessionCount } from "@/parent/progress";
import type { Pronoun } from "@/parent/pronouns";
import type { TimerMode } from "@/session/timer";

const STEPS = ["About you", "Your child", "The plan", "Extra time", "Interests"] as const;

const MUTED = "text-zinc-600 dark:text-zinc-400";
const FIELD = "rounded-md border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700";
const LEGEND = "mb-2 font-medium";
const CHOICE = "flex items-start gap-3 rounded-md border border-zinc-200 p-3 dark:border-zinc-800";

const PACE_LABELS: Readonly<Record<PacePreset, string>> = {
  standard: "Standard",
  "on-track": "On track",
  intensive: "Intensive",
};

const WEEKDAY_LABELS: Readonly<Record<Weekday, string>> = {
  mon: "Mon",
  tue: "Tue",
  wed: "Wed",
  thu: "Thu",
  fri: "Fri",
  sat: "Sat",
  sun: "Sun",
};

const PRONOUN_OPTIONS: readonly { value: Pronoun; label: string }[] = [
  { value: "they", label: "they/them" },
  { value: "she", label: "she/her" },
  { value: "he", label: "he/him" },
];

const TIMER_OPTIONS: readonly { value: TimerMode; label: string }[] = [
  { value: "standard", label: "No, standard time" },
  { value: "extended", label: "Yes, time and a half (1.5x)" },
  { value: "untimed", label: "Yes, no time limit" },
];

const ERROR_MESSAGES: Readonly<Record<OnboardingError, string>> = {
  invalid: "Something in the form didn't check out. Go back and look over each step.",
  "target-too-soon": "That finish date is too soon for any pace. Pick a later date.",
  "target-too-far": "Pick a finish date within two years.",
  "misses-target": "That pace finishes after your date. Pick a faster pace or a later date.",
};

const NAME_RULE = "Letters, spaces, hyphens and apostrophes.";

/** The plan for `pace`, or null while the date field holds no date. */
function planFor(today: string, target: string, pace: PacePreset): Algebra1Plan | null {
  return isCalendarDay(target) ? planAlgebra1(today, target, pace) : null;
}

/** The slowest preset that finishes by the target, so the defaults always make a plan. */
function defaultPace(today: string, target: string): PacePreset {
  const onTime = PACE_PRESETS.find((preset) => {
    const planned = planFor(today, target, preset);
    return planned?.ok && planned.plan.onTime;
  });
  return onTime ?? "intensive";
}

interface NameFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

function NameField({ label, value, onChange }: NameFieldProps) {
  const id = useId();
  const invalid = value.trim() !== "" && cleanName(value) === null;
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="font-medium">
        {label}
      </label>
      <input
        id={id}
        className={FIELD}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        maxLength={NAME_MAX}
        autoComplete="off"
        required
        aria-invalid={invalid}
        aria-describedby={`${id}-rule`}
      />
      <p
        id={`${id}-rule`}
        className={`text-sm ${invalid ? "text-red-700 dark:text-red-400" : MUTED}`}
      >
        First name only. {NAME_RULE}
      </p>
    </div>
  );
}

interface OnboardingFormProps {
  /** The family's calendar day, the plan's first day. */
  today: string;
  defaultTarget: string;
}

/** The parent's five-step setup. The server checks everything again before it stores a thing. */
export function OnboardingForm({ today, defaultTarget }: OnboardingFormProps) {
  const [step, setStep] = useState(0);
  const [parentName, setParentName] = useState("");
  const [studentName, setStudentName] = useState("");
  const [grade, setGrade] = useState("");
  const [pronoun, setPronoun] = useState<Pronoun>("they");
  const [targetDate, setTargetDate] = useState(defaultTarget);
  const [pace, setPace] = useState(() => defaultPace(today, defaultTarget));
  const [sessionDays, setSessionDays] = useState<Weekday[]>(() =>
    proposedDays(PRESET_SESSIONS[pace]),
  );
  const [sessionTime, setSessionTime] = useState(DEFAULT_SESSION_TIME);
  const [timerMode, setTimerMode] = useState<TimerMode>("standard");
  const [interests, setInterests] = useState<Interest[]>([]);
  const [favorites, setFavorites] = useState<Partial<Record<Interest, string>>>({});
  const [error, setError] = useState<OnboardingError | null>(null);
  const [pending, startTransition] = useTransition();
  const heading = useRef<HTMLHeadingElement>(null);
  const moved = useRef(false);
  const ids = useId();

  // Each step change moves focus to the new step's heading, so a screen reader announces it.
  useEffect(() => {
    if (moved.current) heading.current?.focus();
  }, [step]);

  const planned = planFor(today, targetDate, pace);
  const plan = planned?.ok ? planned.plan : null;
  const name = cleanName(studentName) ?? "your child";
  const valid = [
    cleanName(parentName) !== null,
    cleanName(studentName) !== null && grade !== "",
    plan !== null &&
      plan.onTime &&
      sessionDays.length === plan.sessionsPerWeek &&
      sessionTime !== "",
    true,
    interests.length >= 1 && interests.length <= 2,
  ][step];
  const last = step === STEPS.length - 1;

  function go(to: number) {
    moved.current = true;
    setError(null);
    setStep(to);
  }

  function choosePace(preset: PacePreset) {
    setPace(preset);
    setSessionDays(proposedDays(PRESET_SESSIONS[preset]));
  }

  function toggleDay(day: Weekday, on: boolean) {
    setSessionDays((days) =>
      on ? WEEKDAYS.filter((d) => d === day || days.includes(d)) : days.filter((d) => d !== day),
    );
  }

  /** An empty `favorite` clears it. */
  function setFavorite(interest: Interest, favorite: string) {
    setFavorites((current) => {
      const next = { ...current };
      delete next[interest];
      return favorite === "" ? next : { ...next, [interest]: favorite };
    });
  }

  function toggleInterest(interest: Interest, on: boolean) {
    setInterests((picked) =>
      on ? [...picked, interest] : picked.filter((tag) => tag !== interest),
    );
    if (!on) setFavorite(interest, "");
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!valid || pending) return;
    if (!last) {
      go(step + 1);
      return;
    }
    startTransition(async () => {
      const result = await completeOnboarding({
        parentName,
        studentName,
        grade: Number(grade),
        pronoun,
        targetDate,
        pace,
        sessionDays,
        sessionTime,
        timerMode,
        interests,
        favorites,
      });
      setError(result.error);
    });
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6" noValidate>
      <div className="flex flex-col gap-1">
        <p className={`text-sm ${MUTED}`}>
          Step {step + 1} of {STEPS.length}
        </p>
        <h2 ref={heading} tabIndex={-1} className="text-xl font-semibold outline-none">
          {STEPS[step]}
        </h2>
      </div>

      {step === 0 && (
        <NameField label="Your first name" value={parentName} onChange={setParentName} />
      )}

      {step === 1 && (
        <div className="flex flex-col gap-5">
          <NameField
            label="Your child's first name"
            value={studentName}
            onChange={setStudentName}
          />
          <div className="flex flex-col gap-2">
            <label htmlFor={`${ids}-grade`} className="font-medium">
              Grade
            </label>
            <select
              id={`${ids}-grade`}
              className={FIELD}
              value={grade}
              onChange={(event) => setGrade(event.target.value)}
              required
            >
              <option value="" disabled>
                Pick a grade
              </option>
              {GRADES.map((g) => (
                <option key={g} value={g}>
                  Grade {g}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor={`${ids}-pronoun`} className="font-medium">
              Pronoun
            </label>
            <select
              id={`${ids}-pronoun`}
              className={FIELD}
              value={pronoun}
              onChange={(event) => setPronoun(event.target.value as Pronoun)}
              aria-describedby={`${ids}-pronoun-hint`}
            >
              {PRONOUN_OPTIONS.map(({ value, label }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <p id={`${ids}-pronoun-hint`} className={`text-sm ${MUTED}`}>
              Used in the alerts we send you.
            </p>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <label htmlFor={`${ids}-target`} className="font-medium">
              Finish Algebra 1 by
            </label>
            <input
              id={`${ids}-target`}
              type="date"
              className={FIELD}
              value={targetDate}
              min={addDays(today, 1)}
              max={addDays(today, MAX_TARGET_DAYS)}
              onChange={(event) => setTargetDate(event.target.value)}
              required
            />
          </div>

          <fieldset className="flex flex-col gap-2">
            <legend className={LEGEND}>Pace</legend>
            {PACE_PRESETS.map((preset) => {
              const option = planFor(today, targetDate, preset);
              const finish =
                option?.ok
                  ? `${option.plan.onTime ? "Done" : "Too slow: done"} by ${formatDate(option.plan.finishDate)}`
                  : null;
              return (
                <label key={preset} className={CHOICE}>
                  <input
                    type="radio"
                    name="pace"
                    className="mt-1"
                    checked={pace === preset}
                    onChange={() => choosePace(preset)}
                  />
                  <span className="flex flex-col">
                    <span className="font-medium">
                      {PACE_LABELS[preset]}: {PRESET_SESSIONS[preset]} a week
                    </span>
                    {finish && <span className={`text-sm ${MUTED}`}>{finish}</span>}
                  </span>
                </label>
              );
            })}
          </fieldset>

          <section
            aria-label="Your plan"
            aria-live="polite"
            className="flex flex-col gap-3 rounded-lg border border-zinc-200 p-5 dark:border-zinc-800"
          >
            {planned === null && <p>Pick a finish date to see the plan.</p>}
            {planned?.ok === false &&
              (planned.error === "target-too-far" ? (
                <p>Pick a finish date within two years.</p>
              ) : (
                <p>
                  That date needs more than {MAX_SESSIONS_PER_WEEK} sessions a week. The earliest
                  finish is {formatDate(planned.earliestTarget)}.
                </p>
              ))}
            {plan && (
              <>
                <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1">
                  <dt className={MUTED}>Algebra 1</dt>
                  <dd>
                    About {ALGEBRA1_SESSION_ESTIMATE} sessions of {SESSION_MINUTES} minutes
                    (estimate)
                  </dd>
                  <dt className={MUTED}>Each week</dt>
                  <dd>
                    {sessionCount(plan.sessionsPerWeek)} a week,{" "}
                    {formatWeeklyTime(plan.weeklyMinutes)} a week
                  </dd>
                  <dt className={MUTED}>Finish</dt>
                  <dd>
                    {formatDate(plan.finishDate)}, {plan.weeks} weeks from today
                  </dd>
                </dl>
                {!plan.onTime && (
                  <p className="text-red-700 dark:text-red-400">
                    This pace finishes after your date, which needs {plan.requiredPerWeek} sessions
                    a week. Pick a faster pace or a later date.
                  </p>
                )}
                <h3 className="font-medium">Milestones</h3>
                <ol className="flex flex-col gap-1 text-sm">
                  {plan.milestones.map(({ title, date }) => (
                    <li key={title} className="flex justify-between gap-4">
                      <span>{title}</span>
                      <span className={MUTED}>{formatDate(date)}</span>
                    </li>
                  ))}
                </ol>
              </>
            )}
          </section>

          {plan && (
            <fieldset aria-describedby={`${ids}-days-hint`}>
              <legend className={LEGEND}>Session days</legend>
              <p id={`${ids}-days-hint`} className={`mb-3 text-sm ${MUTED}`}>
                Pick {plan.sessionsPerWeek}. These are the days a session is due.
              </p>
              <div className="flex flex-wrap gap-2">
                {WEEKDAYS.map((day) => {
                  const on = sessionDays.includes(day);
                  return (
                    <label key={day} className={`${CHOICE} items-center py-2`}>
                      <input
                        type="checkbox"
                        checked={on}
                        disabled={!on && sessionDays.length >= plan.sessionsPerWeek}
                        onChange={(event) => toggleDay(day, event.target.checked)}
                      />
                      {WEEKDAY_LABELS[day]}
                    </label>
                  );
                })}
              </div>
            </fieldset>
          )}

          <div className="flex flex-col gap-2">
            <label htmlFor={`${ids}-time`} className="font-medium">
              Session starts at
            </label>
            <input
              id={`${ids}-time`}
              type="time"
              className={FIELD}
              value={sessionTime}
              step={300}
              onChange={(event) => setSessionTime(event.target.value)}
              required
            />
          </div>
        </div>
      )}

      {step === 3 && (
        <fieldset className="flex flex-col gap-2" aria-describedby={`${ids}-timer-hint`}>
          <legend className={LEGEND}>Does your child need extra time?</legend>
          {TIMER_OPTIONS.map(({ value, label }) => (
            <label key={value} className={CHOICE}>
              <input
                type="radio"
                name="timer"
                className="mt-1"
                checked={timerMode === value}
                onChange={() => setTimerMode(value)}
              />
              {label}
            </label>
          ))}
          <p id={`${ids}-timer-hint`} className={`text-sm ${MUTED}`}>
            Only the clocks change. Mastery takes the same work, and your view notes the setting.
          </p>
        </fieldset>
      )}

      {step === 4 && (
        <div className="flex flex-col gap-6">
          <fieldset className="flex flex-col gap-2">
            <legend className={LEGEND}>
              Hand the screen to {name}. What are you into? Pick 1 or 2.
            </legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {INTERESTS.map((interest) => {
                const on = interests.includes(interest);
                return (
                  <label key={interest} className={`${CHOICE} items-center`}>
                    <input
                      type="checkbox"
                      checked={on}
                      disabled={!on && interests.length >= 2}
                      onChange={(event) => toggleInterest(interest, event.target.checked)}
                    />
                    {INTEREST_LABELS[interest]}
                  </label>
                );
              })}
            </div>
          </fieldset>
          {interests.map((interest) => (
            <div key={interest} className="flex flex-col gap-2">
              <label htmlFor={`${ids}-favorite-${interest}`} className="font-medium">
                Favorite in {INTEREST_LABELS[interest].toLowerCase()} (optional)
              </label>
              <select
                id={`${ids}-favorite-${interest}`}
                className={FIELD}
                value={favorites[interest] ?? ""}
                onChange={(event) => setFavorite(interest, event.target.value)}
              >
                <option value="">No pick</option>
                {FAVORITES[interest].map((favorite) => (
                  <option key={favorite} value={favorite}>
                    {favorite}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      )}

      {error && (
        <p role="alert" className="text-red-700 dark:text-red-400">
          {ERROR_MESSAGES[error]}
        </p>
      )}

      <div className="flex gap-3">
        {step > 0 && (
          <button type="button" className="btn-secondary" onClick={() => go(step - 1)}>
            Back
          </button>
        )}
        <button type="submit" className="btn-primary" disabled={!valid || pending}>
          {last ? (pending ? "Saving…" : "Finish setup") : "Next"}
        </button>
      </div>
    </form>
  );
}
