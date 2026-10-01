# Milestone 08: Onboarding and pace calculator

Status: done
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

- Pace calculator: `planPace` in `src/engine/pace.ts` is pure. It takes the session count, the unit outline, start, target and a preset or explicit sessions/week, and returns sessions/week, weekly minutes, weeks, finish date, `requiredPerWeek`, `onTime` and one milestone date per unit, or `target-too-soon` with `earliestTarget`. Weeks run seven days from the start; a unit is due at the end of the week its last session falls in. `ALGEBRA1_SESSION_ESTIMATE = 120` [Estimate]; the outline is `ALGEBRA1_UNITS` in `src/content/algebra1/units.ts` (nine units, a test keeps the sum at 120). `planAlgebra1` in `src/onboarding/plan.ts` is the one call the form previews and the server checks, so they cannot disagree. A pace slower than the target needs is refused (`misses-target`), as is a target more than two years out. Next May at On track: 4 a week, 2 hours, 30 weeks, done Apr 28, 2027 from Oct 1, 2026.
- Weekdays: `proposedDays(n)` (3: Mon, Wed, Fri; 4: Mon, Tue, Thu, Sun; 6: Mon to Sat) and `DEFAULT_SESSION_TIME = "17:00"`. Stored on `students.session_days` (JSON array of `mon`..`sun`, exactly one per session a week, zod-checked) and `students.session_time` (24-hour "HH:MM", the family's time zone). Migration 0006 also adds `pronoun` (`she | he | they`, default `they`) and `favorites`. 09's streak and 10's lock read `session_days` and `session_time`; `weekdayOf` and `scheduleDays` in `src/engine/pace.ts` do the calendar math on YYYY-MM-DD strings with no time zone.
- Schedule: `enrollStudent` writes `scheduled` rows for 14 days on the chosen weekdays, starting today (the family's day, `calendarDay`), or tomorrow when the family's clock (`clockTime`) is already past the chosen start time, each with the course's first concept (`firstConcept()`, which is what the planner gives a student who has mastered nothing) and its own random seed. `studentPace` now reads the student's weekdays and counts through `plannedSlots` in `src/parent/progress.ts`, which carries the schedule on past the stored rows on those weekdays, so the behind count keeps working after two weeks with no job writing rows. Nothing writes rows past the first two weeks; `markDayMissed` adds one when needed. A row written ahead of time takes the student's current concept when it is marked missed, and session history sorts by the day a row is for (`coalesce(started_at, scheduled_for, created_at)`). The pace plan itself always starts today. Maya now has session days, so one missed row makes every later Mon/Tue/Thu/Sun count: run `npm run db:reset` after rehearsing "Simulate missed session", or the demo shows more than "1 session behind".
- Maya is seeded on the On track days with "she", so the alert still reads "She's 1 session behind her May target." `missedSessionMessage(name, pronoun, behind, target)` uses `PRONOUN_FORMS` in `src/parent/pronouns.ts` ("They're ... their" for they).
- Current student: `currentStudentId()` in `src/session/current-student.ts` reads the httpOnly `klade_student` cookie (a UUID, else the demo student). `completeOnboarding` sets it with `rememberStudent`. `/student`, the session page, the session actions and the coach route use it; `/parent`, `/admin` and the alert preview still act for the demo family, so a newly onboarded family's parent view shows Maya. Sign-in replaces this one module. To get back to Maya in a browser that onboarded, clear the cookie or use a private window. The smoke specs each get a fresh browser context, so only `onboarding.spec.ts` acts as the new student. Unit tests get an in-memory cookie jar from `tests/setup.ts` (empty per test, so they act as Maya).
- Data minimization: `OnboardingInput` is a zod `strictObject` (an email or birthdate field is refused, not dropped). Names are first names only (letters, spaces, hyphens, apostrophes, 30 max). The "favorite" follow-up is a pick from a fixed list per interest (`FAVORITES` in `src/content/interests.ts`), not a text box, so the profile still holds no free text beyond the first name; a favorite is accepted only for a picked interest and from its list. Nothing reads favorites yet.
- Form: the default target is next May and the default pace is the slowest preset that makes it (On track until early November, faster after), so the defaults always give a plan. `src/app/onboarding/onboarding-form.tsx` is the only client code on `/onboarding` and runs `planAlgebra1` in the browser for the live plan; zod stays on the server. Focus moves to each step's heading. First-load JS (Lighthouse, gzipped): `/onboarding` 142.7 KB, `/` and `/student` 141.4 KB (the home page now links to `/onboarding`), `/parent` and `/admin` 141.4 KB, the session route 148.3 KB. The 150 KB budget was not raised.
- Smoke: `tests/smoke/onboarding.spec.ts` onboards Ava (gaming + animals, extended time) in about 4 s, sets a target 34 whole weeks out (next May's distance from Oct 1, so the test holds on any day) and checks AC 2 on the plan step and that Standard is refused, lands on `/student`, starts the session, walks warm-up and the lesson, and checks the first guided word problem is gaming- or animals-framed. `tests/smoke/flow.ts` holds `expectBlock` and `solveBlock` for both session specs; `tests/helpers/answers.ts` now loads a session as whichever student owns it.
- Left: onboarding has no rate limit and no sign-in, so anyone with the URL can create families (fine for the demo, not for a public pilot). The admin panel's interest radios still show raw tags; `INTEREST_LABELS` has the display names.
