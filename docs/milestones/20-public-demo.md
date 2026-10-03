# Milestone 20: Public demo, one copy per visitor

Status: not started
Session: one shot

## Goal

The link on the pitch deck, https://foothold.rathworkspace.cloud/student, works for any number of judges at any time with no setup and no admin. Every new browser gets its own fresh copy of the demo persona: Maya's history and streak, the phone rule on, the demo clock set so the phone shows locked, today's session queued with "Start today's session". Visitors never see each other's state, never see the admin bar, and can start over from a button when they reach the end. The signed-in founder keeps the canonical persona and the admin controls exactly as today.

## Read first

- Notes of milestones 08 (current-student cookie, onboarding writes), 13 (demo persona seed, Reset demo), 18 (DEMO_SESSION_SEED, demo content variant, admin ribbon), 19 commits (two-per-section variant selected by student id)
- `src/db/demo.ts`, `src/session/current-student.ts`, `src/session/lock-status.ts`, `src/admin/`, `src/app/student/page.tsx`, `src/app/student/session/[id]/session-complete.tsx`, `src/app/parent/`, `src/proxy.ts`

## Scope

In:

- Visitor copies: when a request to `/student` (or any student route) carries no student cookie and no gate cookie, create a new family and student that are a full copy of the demo persona's starting state (the same rows `resetDemoData` writes: schedule, done sessions, mastery, XP, badges, reward progress, mentor assignment, lock rule, `demo_clock` at the rule's session day 5:05 PM so the phone is locked), mark the family `visitor = true` with a `created_at`, set the student cookie, and continue. Copies use the fixed `DEMO_SESSION_SEED` and the two-per-section demo content, so every judge sees the same problems. The canonical persona (`DEMO_STUDENT_ID`) is untouched; a browser with the gate cookie keeps using it.
- Start over: a "Start the demo over" button on the session completion screen and on the student home (visible only for visitor copies) that resets that copy to its starting state through the same code path, never touching any other family. No admin ribbon, no demo-clock button, nothing gated is reachable for visitors.
- Parent view for visitors: `/parent`, `/parent/explanations`, `/parent/alerts`, `/parent/mentor` and `/parent/settings` open without the gate for a visitor copy and show only that copy's data; `/admin` and the alert email preview stay behind the gate. For a browser with no cookie at all, `/parent` creates the copy the same way `/student` does.
- Cleanup: visitor families older than 48 hours are deleted by a sweep that runs at most once an hour on an incoming request (no cron); deletion removes every row the copy owns. A unit test proves the sweep never touches the canonical family.
- Concurrency and abuse: creating a copy is cheap and bounded (one per cookie-less browser per request path), the per-process coach rate limit applies per session as today, and a visitor cannot reach another visitor's rows through any id in a URL (every query scopes by the cookie's student and family).
- Tests: copy creation and isolation, start-over resets only the copy, the sweep, visitor parent pages scoped to the copy, gate still required for `/admin`; smoke: a fresh context opens `/student`, sees "Start today's session" and the locked phone, runs the two-per-section session to the completion screen with the unlocked phone, presses Start the demo over and sees the starting state again; a second fresh context sees its own untouched copy.

Out (do not build, even if tempting):

- Accounts, sign-in, any change to the coach, the grader, the exit rule, the content, or the founder's admin flow.

## Acceptance criteria

1. A private window opening the deck link shows "Start today's session", the locked phone and no admin controls; a second private window at the same time sees its own identical starting state.
2. Finishing the session shows the completion screen and the unlocked phone, and "Start the demo over" returns that browser to the starting state within 5 s.
3. The canonical demo persona and the signed-in founder's flow are unchanged; `/admin` still requires the gate.
4. Visitor copies older than 48 hours are removed; the canonical family never is.
5. Every route scores 90 or better; budgets unchanged; `scripts/gate.sh` exits 0.

## Smoke path

Fresh context → `/student` shows the starting state → Start → warm-up, chapter confirm, guided with a wrong answer and I'm stuck (coach asserted offline with the key unset), explain-back via the smoke helper, exit → completion with the unlocked phone → Start the demo over → starting state. Second fresh context → its own starting state.

## Notes for the next milestone

Filled in at the end of the session.
