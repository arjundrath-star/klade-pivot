# Milestone 07: Parent view, admin panel, missed-session alert

Status: done
Session: one shot

## Goal

The parent sees session history, mastery per concept, the student's verbatim explanation with the verdict, and progress against the target date. An admin panel exists for the demo: simulate a missed session, switch the student's interest live, and show AI cost per session.

## Read first

- `docs/memo/02-mvp-spec-v1.md` §3.4, §3.5, §8 items 6, 7, 9
- `docs/memo/07-pitch-language.md` (alert copy must match: "Maya missed today's Algebra session. She's 1 session behind her May target.")

## Scope

In:

- `/parent`: server-rendered. Session history (date, done / missed / repeat, minutes), mastery grid per concept, latest explain-back verbatim with the grader's verdict sentence, progress line ("On track for May" or "N sessions behind"). Behind/on-track is computed from scheduled vs completed sessions, completed as defined in 06 (exit check attempted with no hints) since the start date at the chosen pace. The explain-back panel is labeled 'What Maya can explain'; no parent-facing string in `/parent`, the alert list, or the email preview may contain 'prove', 'proof', or 'verified'.
- Alerts: `alerts` rows with type `missed | behind | milestone`, an in-app notification list on `/parent`, and an email preview page `/parent/alerts/[id]/preview` rendering the exact email HTML. No email is sent.
- `/admin`: "Simulate missed session" (marks today's scheduled session missed, creates the alert, recomputes behind status), "Switch interest" (updates the student's interests; the next rendered word problem reflects it), and an AI cost table: per session, calls, tokens in, out, cache read and cache write, and cost in cents computed from the model price table in `src/coach/pricing.ts`. Also "Override explain-back" for the demo: records a passing `explain_backs` row for the open session with `source = 'override'` and shows an "override" tag wherever that explanation appears in `/parent`, so a grader outage cannot stall a live run. Prototype safety valve; never rendered to the student.
- Review items left: the mastery alert is a separate write after `finishSession` (as the carry-over asked), so a failed alert insert after a committed finish loses that alert and shows the student an error; moving it into the `finishSession` batch is the fix if it ever matters. The "She's" copy and the unguarded `/admin` are above. `src/session/alerts.ts` and `src/app/student/actions.ts` both draw seeds with `randomInt(0, 2 ** 32)`.
- Site copy: replace the `src/app/layout.tsx` description "proves to the parent that they learned it" with "shows the parent what they can explain", and replace the `src/app/page.tsx` subheadline paragraph with "Thirty-minute sessions on a schedule the parent sets. A same-day alert when one is skipped. A coach that never gives the answer, and a record of what the kid can explain." The h1 and the smoke assertion on it stay unchanged (decision D23 pending).
- Unit tests: behind/on-track computation, cost computation, alert copy, and a test that scans the parent-facing strings under `src/app/parent/`, `src/app/layout.tsx` and `src/app/page.tsx` for 'prove', 'proof', and 'verified' and fails on any hit.

Out:

- Real email or SMS delivery, auth, multiple students.

## Acceptance criteria

1. Parent view updates immediately after a session and shows the student's own explanation. AC 6.
2. "Simulate missed session" produces the alert and updates the behind/on-track status. AC 7.
3. Per-session AI token cost is logged and displayed in `/admin`. AC 9.
4. `scripts/gate.sh` exits 0.

## Smoke path

`/parent` renders history and mastery → `/admin` → Simulate missed session → `/parent` shows the alert and "1 session behind" → `/admin` → Switch interest to gaming → the next word problem in a new session is gaming-framed.

Add `/parent` and `/admin` to `ROUTES` in `scripts/lighthouse.mjs`.

## Notes for the next milestone

- Schedule: a schedule day is a `session_logs` row with `scheduled_for` (the family's calendar day, YYYY-MM-DD) and status `scheduled` or `missed`; a partial unique index keeps one per student per day (migration 0005). Sessions the student opens leave `scheduled_for` null, and finishing one does not touch the schedule row. "Today" is `calendarDay(now)` in `src/parent/progress.ts`, which reads the day in America/New_York (the box runs on UTC). 08 creates the first two weeks of `scheduled` rows on the chosen weekdays; give each the planner's concept and a random seed, the way `markDayMissed` does.
- Behind: `sessionsBehind(slots, completedDays, today)` counts every schedule day before today plus today once marked missed, less the sessions completed on or after the first schedule day (status `done`, which `completeSession` only sets after an unaided exit check, D33), floored at 0. The first schedule day is the start date: sessions from before it do not cover a later miss, and a make-up session on any later day closes the gap. Until 08 writes schedule rows, the only rows are missed days, so the schedule starts at the first miss. `studentPace` in `src/session/pace.ts` runs it against the database; the parent view reads it on every render. `progressLine` gives "On track for May" or "N sessions behind".
- Missed session: `markTodayMissed` in `src/session/alerts.ts` adds today's schedule row if the schedule has none (so the demo works on any weekday), marks it missed, recounts and raises a `missed` alert with `missedSessionMessage`. It refuses a day with a session finished (`done-today`) or still open (`open-today`) on it, and a day already missed (`already-missed`), so for the live demo click "Simulate missed session" before Maya starts a session that day, or seed yesterday as missed (spec §9 note for 10/12). The copy matches the pitch exactly at one behind and uses "She's"; there is no pronoun on the student row (minors' data rule), so 08 should either ask the parent for one or switch the second sentence to the name before a second student exists.
- Alerts: `alerts` was rebuilt in 0005 with `session_log_id` and `message` (the text is stored when raised, so an old alert keeps its numbers) and is unique on (session, type), which makes every raise idempotent. `completeSession` raises a `milestone` alert after `finishSession` returns true when the outcome is mastered; XP and streaks (09) attach in the same place. `behind` is in the enum but nothing raises it yet. No email is sent; `/parent/alerts/[id]/preview` returns the email document from `alertEmailHtml` (inline styles, every value escaped, CSP `default-src 'none'`), scoped to the demo family.
- Parent view: `/parent` is server-rendered with no client components beyond `next/link`, and reads everything in one `Promise.all`: pace, history (done, repeat, missed, in progress, minutes from `block_elapsed_ms`), the mastery grid in course order, the explanation behind the latest decided concept (`mastery.explain_back_id`) with the rubric line and the feedback the student saw, that session's coach transcript (`coachTurnsFor`), integrity signals in aggregate (pasted, typed faster than 15 characters a second), and notifications. `tests/unit/parent/wording.test.ts` fails on "prove", "proof" or "verified" in `src/app/parent/`, `src/parent/`, the layout and the home page; put any new parent-facing copy under those paths.
- Admin: `/admin` has three form actions in `src/app/admin/actions.ts` that redirect back with `?notice=` (zod-checked against `ADMIN_NOTICES`), so the page needs no client JS. "Switch interest" sets one tag (zod enum of the six). "Override explain-back" writes an `explain_backs` row with `source = 'override'`, no text and zero scores for the open session on block 4 (`src/session/override.ts`); `loadSession` returns no `explain.results` once a session has an override (so a failed first try is not left on screen beside an unlocked Next) and `explain.attempts` counting every row, so attempt numbering stays right. The parent view tags it "override". `/admin` and `/parent` have no sign-in, like `/student`; anyone with the public URL (12) can press these buttons. Gate `/admin` behind something before the URL is shared.
- AI cost: `src/coach/pricing.ts` holds `MODEL_PRICES` (Haiku 4.5: $1 in, $5 out, $1.25 cache write, $0.10 cache read per million; Sonnet 5.5: $2, $10, $2.50, $0.20) and `costCents`. `usageBySession` sums the four token columns per session and model; the admin table prices each model separately and shows "no price" rather than zero for an unknown model. Real numbers need an API key on the box, which there still is not.
- Review items left: the mastery alert is a separate write after `finishSession` (as the carry-over asked), so a failed alert insert after a committed finish loses that alert and shows the student an error; moving it into the `finishSession` batch is the fix if it ever matters. The "She's" copy and the unguarded `/admin` are above. `src/session/alerts.ts` and `src/app/student/actions.ts` both draw seeds with `randomInt(0, 2 ** 32)`.
- Site copy: the layout description and the home subheadline changed as specified; the h1 and its smoke assertion did not.
- First-load JS (Lighthouse, gzipped): `/` and `/student` 136.7 KB, `/parent` and `/admin` 140.7 KB, the session route 147.6 KB (was 147.5 KB). The 150 KB budget was not raised. All five routes score 100/100/100.
- Tests: `tests/unit/db/parent-view.test.ts` covers the missed flow, the override, the mastery alert and the cost sums against a real libSQL file. The smoke spec `tests/smoke/parent.spec.ts` walks the milestone's smoke path and restores Maya's interests and closes its session afterwards. Playwright now runs with `workers: 1`, since every spec shares the one demo student.
