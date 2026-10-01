# Milestone 08: Onboarding and pace calculator

Status: not started
Session: one shot

## Goal

A new parent creates the account, enters the student's name and grade, picks a target finish date and pace, answers one accommodation question, and the student picks interests. The plan (sessions, sessions per week, weekly time, milestone timeline) appears in under 60 seconds of interaction.

## Read first

- `docs/memo/02-mvp-spec-v1.md` §3.1
- `docs/memo/01-company-memo-v1.md` §6.3 (pace table), §6.5a (accommodations)

## Scope

In:

- `src/engine/pace.ts`: pure function from (course session count, start date, target date, pace preset or explicit sessions/week) to sessions per week, weekly minutes, weeks, and unit milestone dates. Algebra 1 total sessions is a named constant `ALGEBRA1_SESSION_ESTIMATE = 120` marked as an estimate in a comment with the memo reference. Unit-tested, including impossible targets (more than 6 sessions/week needed) which return a clear "target too soon" result. The plan also proposes session weekdays from the sessions-per-week count (3: Mon, Wed, Fri; 4: Mon, Tue, Thu, Sun; 6: Mon to Sat) and a default start time of 5:00 PM; the streak (09) and the lock rule (10) read them.
- `/onboarding` as a short multi-step form: parent name → student first name and grade (6 to 10) → target date with the three presets (Standard 3/wk, On track 4/wk, Intensive 6/wk) and the computed plan shown live, with the proposed weekdays and start time editable → accommodation question ("Does your child need extra time?" → standard / extended / untimed) → student interests (pick 1 or 2 of the six, optional favorite specifics) → done, redirect to `/student`.
- Server action creates `families` and `students` rows (including `session_days` and `session_time`) and the scheduled `session_logs` for the first two weeks on those weekdays.
- Data minimization: no email, no birthdate. Grade and first name only.
- Unit tests for `pace.ts`; a component test is not required.

Out:

- Payments, real auth, password, email verification.

## Acceptance criteria

1. A new parent can onboard and see a pace plan in under 60 seconds. AC 1. The smoke test completes it in under 20 s of automation.
2. The plan for "target next May, On track" shows 4 sessions/week, 2 hours/week, and Mon, Tue, Thu, Sun as session days.
3. `scripts/gate.sh` exits 0.

## Smoke path

`/onboarding` → complete all steps for a new student with interests gaming + animals → `/student` shows the new student's first session → start it → the first word problem is gaming- or animals-framed.

Add `/onboarding` to `ROUTES` in `scripts/lighthouse.mjs`.

## Notes for the next milestone

Filled in at the end of the session.
