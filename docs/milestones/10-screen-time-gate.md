# Milestone 10: Screen-time gate (parent rule builder and phone panel, mock)

Status: done
Session: one shot

## Goal

The demo centerpiece. A parent sets a lock rule once ("on session days, lock games and social from 5:00 PM until today's session is done"), a simulated phone in the web app shows those apps locked while the session is not done, and the moment the kid completes the session the phone unlocks live with the XP and streak toast. A one-tap parent override unlocks it for the night. Real UI and real persistence; the phone is a mock panel, labeled prototype, and it can never block or crash the core loop.

## Read first

- `docs/memo/08-mvp-steering-oct1.md` §3.1, §5, §6 (acceptance checks 15 to 18 and 21), §7 steps 1, 2 and 4
- 08 notes (session days and start time on the student), 06 notes (completion function), 09 notes (XP and streak data)

## Scope

In:

- `lock_rules` table: student, enabled, days (JSON weekday set, default the student's session days), start_time (default 17:00), categories (JSON from social, games, video, streaming), weekend_off, override_until. One row per student.
- Onboarding gets one more step after interests, skippable: the rule builder with defaults already filled from the pace plan, saved on continue.
- `/parent/settings`: edit days, time and categories, master toggle, weekend off, and "Unlock tonight", which sets override_until to the end of today. Server actions validated with zod; every write scoped to the demo family.
- `src/session/lock.ts`: pure `lockState(rule, now, todaySessionStatus)` returning locked or unlocked with the reason. Locked when the rule is enabled, today is a session day (and not a weekend-off day), now is at or past start_time, today's scheduled session is not done, and no override is active.
- Demo clock: `families.demo_clock` (nullable timestamp) set from `/admin` ("Simulate: session day, 5:05 PM") and cleared by "Reset demo"; `lockState` uses it when set so the demo does not depend on the real day and hour. Never read anywhere else.
- Phone panel: a phone-shaped frame embedded on `/parent` and on `/student`, generic app icons with no real brands, locked state shows "Locked. Finish today's 30-minute session to unlock." with an Open session button. A tiny client component polls `GET /api/lock-state` every 3 s; the route computes state server-side. When the state flips to unlocked it shows the toast with the XP and streak from 09. Loaded on demand; the session route budget is unchanged.
- Unit tests: `lockState` across day, time, completion, override, toggle, weekend-off and demo-clock combinations; the route rejects malformed input.

Out (do not build, even if tempting):

- Real device control, a native app, push notifications, real app names or logos, anything the student can do to change the rule.

## Acceptance criteria

1. Parent can create, edit, and toggle a session-day lock rule (day, time, app categories); it persists across reloads. Steering AC 15.
2. The phone panel shows locked apps when a rule is active and today's session is incomplete. Steering AC 16.
3. Completing the session unlocks the phone panel within one poll interval and shows the XP and streak update. Steering AC 17.
4. "Unlock tonight" unlocks the panel without completing the session. Steering AC 18.
5. With the rule disabled or the row missing, every core-loop route renders and the smoke path from 06 still passes. Steering AC 21.
6. `scripts/gate.sh` exits 0.

## Smoke path

`/onboarding` for a new student sets the rule → `/admin` sets the demo clock → `/parent` phone panel is locked → complete the session (smoke helpers as in 06) → the panel unlocks and shows the toast → `/parent/settings` → Unlock tonight → the locked state cannot return today.

Add `/parent/settings` to `ROUTES` in `scripts/lighthouse.mjs`.

## Notes for the next milestone

- Pure rule: `lockState(rule, clock, today, now)` in `src/session/lock.ts` returns `{ locked: true, reason: "session-due" }` or `{ locked: false, reason }` with the first condition that let the phone go, in this order: `no-rule`, `off`, `weekend-off`, `not-session-day`, `before-start`, `session-done`, `override`. Day and time are the family's (`calendarDay`, `clockTime`), so 9 PM Thursday in New York locks even though the server reads Friday UTC. Finishing before the start time never locks. `clock` is what the rule reads (the demo clock when set); `now` is real time, and tonight's unlock (`overrideActive`, shared with the settings page) runs out against it, so an unlock ends at the real midnight even under a frozen demo clock. `LockRuleFields` (days, startTime, categories, weekendOff) is the one rule shape; `defaultRule(plan)` gives the plan's days and start time with games and social, and both onboarding and settings start from it.
- Storage (migration 0008): `lock_rules` (one row per student, unique on `student_id`; `enabled`, `days`, `start_time`, `categories`, `weekend_off`, `override_until`), `families.demo_clock`, and a `(student_id, status, completed_at)` index on `session_logs` for the poll's "latest finished session" read. The zod input is `LockRuleInput` in `src/onboarding/schema.ts` (a strictObject, at least one day and one category, and a weekday when weekends are off, since a rule of only Saturday and Sunday with weekends off could never lock); it stays there so zod never reaches a client chunk. Every write in `src/db/queries/lock.ts` checks the student belongs to the family.
- Status: `lockView(studentId, now, { reward })` in `src/session/lock-status.ts` is the one place the demo clock is read. With it set, the clock stands in for `now` as the time the rule reads; whether today's session is done is always the real day's (a session completed on the real calendar day), so a demo on Friday with the clock on Thursday 5:05 PM still unlocks the moment the session finishes. The reward (that session's XP and the streak after it, from `sessionRewards`) is worked out only when asked for. `GET /api/lock-state?view=parent|student[&reward=1]` returns it with `no-store`; `parent` is the demo student (like the rest of `/parent`), `student` is `currentStudentId()`. Anything else is a 400.
- Demo clock: `/admin` "Simulate: session day, 5:05 PM" sets it to the latest day on or before today that the rule locks on, five minutes after the rule's start (`demoClockFor`; the button label follows the start time). "Reset demo" clears it. Both clear every running "Unlock tonight" on the family (`resetDemoClock`), so a rehearsal starts locked. If the demo student already finished a session today, the phone cannot lock again that day; Simulate then says so (`clock-done`) and points at `npm run db:reset`. For Oct 2 (a Friday) with Maya's Mon/Tue/Thu/Sun, the clock lands on Thu Oct 1, 5:05 PM, which matches the demo script's "It's Thursday, 5 PM". Run Simulate before the session, set the rule first (Maya's seed has none).
- Override: "Unlock tonight" sets `override_until` to the family's next midnight (`familyMoment`, which converts a family day and time to an instant across daylight time). Saving the rule keeps it; only the admin actions clear it.
- Panel: `src/phone/phone-slot.tsx` draws the phone body and loads `phone-panel.tsx` with `next/dynamic` (`ssr: false`); `PhoneSection` lays it out beside its caption on `/parent` (always) and `/student` (only when the student has a rule). The page passes the server's `lockView` as `initial`, so there is no fetch waterfall; the panel then polls 3 s after each answer (chained, so a slow answer never lands after a newer one), skips while the tab is hidden, asks for `reward=1` only while it shows the phone locked, and drops the banner (+XP, `streakLabel`) on the locked to unlocked flip. A failed poll keeps the last state. Apps are made up (`src/phone/apps.tsx`, inline SVG): two per category, plus a dock of always-allowed apps that never lock. Reduced motion turns the unlock animation off. `/parent/settings` is server-rendered with three form actions (`saveRule`, `switchRule`, `unlockTonight`) that redirect back with a zod-checked `?notice=`; it shares `RuleFields` with the onboarding step.
- Onboarding: step 6 "Phone rule" follows interests, filled from the plan's days and time. "Finish setup" sends the rule; "Skip for now" sends `lockRule: null`, and no row is written. `createFamily` writes the rule in the same batch as the family. The step's inputs are uncontrolled (shared with settings), so going Back and Next again resets edits on that step.
- Tests: `tests/unit/session/lock.test.ts` (every reason, the start-time boundary, an expired override, weekend off, the family's time zone, `demoClockFor`), `tests/unit/parent/phone-rule.test.ts` (copy, `familyMoment` on both sides of daylight time, `phoneClock`), `tests/unit/db/lock.test.ts` (route validation, settings and admin actions, family scoping, demo clock, override through rule edits, unlock on completion with the reward). Smoke `tests/smoke/lock.spec.ts`: Maya's rule created, edited and switched with reloads, demo clock locks `/parent`, "Unlock tonight" from a second tab unlocks the open panel within a poll, a rule edit does not relock, then the rule is left off and the demo reset so the later specs run with a disabled rule (AC 5). A second test onboards Leo with every day from 00:00, so his phone is locked whenever CI runs, finishes his session in another tab and sees the panel unlock with "+50 XP". The onboarding spec now skips the rule step and checks `/student` has no phone. `answerExitCheck` moved to `tests/smoke/flow.ts`, `redirectOf` to `tests/helpers/database.ts`, and the session helpers take a student id.
- First-load JS (Lighthouse, gzipped): `/parent` 147.1 KB (was 141.5; the panel chunk loads after hydration and is counted), `/onboarding` 145.0 KB (was 143.0), `/student` 143.0 KB, `/parent/settings`, `/admin` and `/` 141.5 KB, the session route 148.3 KB (unchanged). The 150 KB budget was not raised. All routes 100/100/100.
- Left: `/parent/settings`, like `/admin` and `/parent`, has no sign-in and acts for the demo family; gate them before the public URL (12). A newly onboarded family's `/parent` still shows Maya and her phone. The rule's days are its own after creation: changing the plan's session days later does not move them. Weekend off only matters when the rule's days include Saturday or Sunday.
