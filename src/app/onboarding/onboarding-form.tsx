"use client";

import { useEffect, useId, useRef, useState, useTransition, type FormEvent } from "react";
import { completeOnboarding, type OnboardingError } from "./actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Choice, Field, inputClass, Legend } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { ProgressBar } from "@/components/ui/progress";
import { FAVORITES, INTEREST_LABELS } from "@/content/interests";
import {
  addDays,
  ALGEBRA1_SESSION_ESTIMATE,
  CLOCK_TIME_PATTERN,
  DEFAULT_SESSION_TIME,
  formatWeeklyTime,
  isCalendarDay,
  MAX_SESSIONS_PER_WEEK,
  PACE_PRESETS,
  PRESET_SESSIONS,
  proposedDays,
  SESSION_MINUTES,
  WEEKDAY_LABELS,
  WEEKDAYS,
  type PacePreset,
  type Weekday,
} from "@/engine/pace";
import { INTERESTS, type Interest } from "@/engine/types";
import { cleanName, GRADES, NAME_MAX } from "@/onboarding/fields";
import { MAX_TARGET_DAYS, planAlgebra1, type Algebra1Plan } from "@/onboarding/plan";
import { formatDate, sessionCount } from "@/parent/progress";
import type { Pronoun } from "@/parent/pronouns";
import { RuleFields, ruleFromForm } from "@/phone/rule-fields";
import { defaultRule, WEEKEND, type LockRuleFields } from "@/session/lock";
import type { TimerMode } from "@/session/timer";

const STEPS = [
  "About you",
  "Your child",
  "The plan",
  "Extra time",
  "Interests",
  "Phone rule",
] as const;

const FIELD = `${inputClass} w-full`;

const PACE_LABELS: Readonly<Record<PacePreset, string>> = {
  standard: "Standard",
  "on-track": "On track",
  intensive: "Intensive",
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

type FormError = OnboardingError | "rule";

const ERROR_MESSAGES: Readonly<Record<FormError, string>> = {
  rule: "Pick at least one day, a start time and one kind of app (with weekends off, a weekday), or skip this step.",
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
    <Field id={id} label={label} hint={`First name only. ${NAME_RULE}`} invalid={invalid}>
      <input
        id={id}
        className={FIELD}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        maxLength={NAME_MAX}
        autoComplete="off"
        required
        aria-invalid={invalid}
        aria-describedby={`${id}-hint`}
      />
    </Field>
  );
}

interface OnboardingFormProps {
  /** The family's calendar day, the plan's first day. */
  today: string;
  defaultTarget: string;
}

/** The parent's six-step setup. The server checks everything again before it stores a thing. */
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
  const [error, setError] = useState<FormError | null>(null);
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
    true,
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

  /** Stores everything, with the phone rule or without it when the parent skipped it. */
  function finish(lockRule: LockRuleFields | null) {
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
        lockRule,
      });
      setError(result.error);
    });
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!valid || pending) return;
    if (!last) {
      go(step + 1);
      return;
    }
    const rule = ruleFromForm(new FormData(event.currentTarget));
    if (
      rule.days.length === 0 ||
      rule.categories.length === 0 ||
      !CLOCK_TIME_PATTERN.test(rule.startTime) ||
      (rule.weekendOff && rule.days.every((day) => WEEKEND.includes(day)))
    ) {
      setError("rule");
      return;
    }
    finish(rule);
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6" noValidate>
      <div className="flex flex-col gap-3">
        <ProgressBar
          label="Setup progress"
          value={step + 1}
          max={STEPS.length}
          valueText={`Step ${step + 1} of ${STEPS.length}: ${STEPS[step]}`}
          segmented
          size="thin"
        />
        <p className="text-sm text-ink-soft">
          Step {step + 1} of {STEPS.length}
        </p>
        <h2
          ref={heading}
          tabIndex={-1}
          className="font-display text-2xl font-semibold tracking-tight outline-none"
        >
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
          <Field id={`${ids}-grade`} label="Grade">
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
          </Field>
          <Field id={`${ids}-pronoun`} label="Pronoun" hint="Used in the alerts we send you.">
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
          </Field>
        </div>
      )}

      {step === 2 && (
        <div className="flex flex-col gap-6">
          <Field id={`${ids}-target`} label="Finish Algebra 1 by">
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
          </Field>

          <fieldset className="flex flex-col gap-2">
            <Legend>Pace</Legend>
            {PACE_PRESETS.map((preset) => {
              const option = planFor(today, targetDate, preset);
              const finish = option?.ok
                ? `${option.plan.onTime ? "Done" : "Too slow: done"} by ${formatDate(option.plan.finishDate)}`
                : null;
              return (
                <Choice key={preset}>
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
                    {finish && <span className="text-sm text-ink-soft">{finish}</span>}
                  </span>
                </Choice>
              );
            })}
          </fieldset>

          <Card
            aria-label="Your plan"
            aria-live="polite"
            tone="today"
            className="flex flex-col gap-3"
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
                  <dt className="text-ink-soft">Algebra 1</dt>
                  <dd>
                    About {ALGEBRA1_SESSION_ESTIMATE} sessions of {SESSION_MINUTES} minutes
                    (estimate)
                  </dd>
                  <dt className="text-ink-soft">Each week</dt>
                  <dd>
                    {sessionCount(plan.sessionsPerWeek)} a week,{" "}
                    {formatWeeklyTime(plan.weeklyMinutes)} a week
                  </dd>
                  <dt className="text-ink-soft">Finish</dt>
                  <dd>
                    {formatDate(plan.finishDate)}, {plan.weeks} weeks from today
                  </dd>
                </dl>
                {!plan.onTime && (
                  <p className="font-medium text-alert">
                    This pace finishes after your date, which needs {plan.requiredPerWeek} sessions
                    a week. Pick a faster pace or a later date.
                  </p>
                )}
                <h3 className="font-semibold">Milestones</h3>
                <ol className="flex flex-col gap-1 text-sm">
                  {plan.milestones.map(({ title, date }) => (
                    <li key={title} className="flex justify-between gap-4">
                      <span>{title}</span>
                      <span className="text-ink-soft">{formatDate(date)}</span>
                    </li>
                  ))}
                </ol>
              </>
            )}
          </Card>

          {plan && (
            <fieldset aria-describedby={`${ids}-days-hint`}>
              <Legend
                id={`${ids}-days-hint`}
                hint={`Pick ${plan.sessionsPerWeek}. These are the days a session is due.`}
              >
                Session days
              </Legend>
              <div className="flex flex-wrap gap-2">
                {WEEKDAYS.map((day) => {
                  const on = sessionDays.includes(day);
                  return (
                    <Choice key={day} className="items-center py-2">
                      <input
                        type="checkbox"
                        checked={on}
                        disabled={!on && sessionDays.length >= plan.sessionsPerWeek}
                        onChange={(event) => toggleDay(day, event.target.checked)}
                      />
                      {WEEKDAY_LABELS[day]}
                    </Choice>
                  );
                })}
              </div>
            </fieldset>
          )}

          <Field id={`${ids}-time`} label="Session starts at">
            <input
              id={`${ids}-time`}
              type="time"
              className={`${inputClass} w-40`}
              value={sessionTime}
              step={300}
              onChange={(event) => setSessionTime(event.target.value)}
              required
            />
          </Field>
        </div>
      )}

      {step === 3 && (
        <fieldset className="flex flex-col gap-2" aria-describedby={`${ids}-timer-hint`}>
          <Legend>Does your child need extra time?</Legend>
          {TIMER_OPTIONS.map(({ value, label }) => (
            <Choice key={value}>
              <input
                type="radio"
                name="timer"
                className="mt-1"
                checked={timerMode === value}
                onChange={() => setTimerMode(value)}
              />
              {label}
            </Choice>
          ))}
          <p id={`${ids}-timer-hint`} className="text-sm text-ink-soft">
            Only the clocks change. Mastery takes the same work, and your view notes the setting.
          </p>
        </fieldset>
      )}

      {step === 4 && (
        <div className="flex flex-col gap-6">
          <fieldset className="flex flex-col gap-2">
            <Legend>Hand the screen to {name}. What are you into? Pick 1 or 2.</Legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {INTERESTS.map((interest) => {
                const on = interests.includes(interest);
                return (
                  <Choice key={interest} className="items-center">
                    <input
                      type="checkbox"
                      checked={on}
                      disabled={!on && interests.length >= 2}
                      onChange={(event) => toggleInterest(interest, event.target.checked)}
                    />
                    {INTEREST_LABELS[interest]}
                  </Choice>
                );
              })}
            </div>
          </fieldset>
          {interests.map((interest) => (
            <Field
              key={interest}
              id={`${ids}-favorite-${interest}`}
              label={`Favorite in ${INTEREST_LABELS[interest].toLowerCase()} (optional)`}
            >
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
            </Field>
          ))}
        </div>
      )}

      {step === 5 && (
        <div className="flex flex-col gap-6">
          <p className="text-ink-soft">
            Back to you. Lock {name}&apos;s apps on session days until the session is done. This is
            a prototype: it runs a phone shown in this app, not a real phone yet. Change it any time
            in settings, or skip it.
          </p>
          <RuleFields
            id={`${ids}-rule`}
            name={name}
            defaults={defaultRule({ sessionDays, sessionTime })}
          />
        </div>
      )}

      {error && <Notice role="alert">{ERROR_MESSAGES[error]}</Notice>}

      <div className="flex flex-wrap gap-3">
        {step > 0 && (
          <Button variant="secondary" onClick={() => go(step - 1)}>
            Back
          </Button>
        )}
        {last && (
          <Button variant="secondary" disabled={pending} onClick={() => finish(null)}>
            Skip for now
          </Button>
        )}
        <Button type="submit" disabled={!valid || pending}>
          {last ? (pending ? "Saving…" : "Finish setup") : "Next"}
        </Button>
      </div>
    </form>
  );
}
