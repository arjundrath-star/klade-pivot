# Milestone 10: Screen-time gate (parent rule builder and phone panel, mock)

Status: not started
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

Filled in at the end of the session.
