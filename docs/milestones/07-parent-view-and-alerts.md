# Milestone 07: Parent view, admin panel, missed-session alert

Status: not started
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
- `/admin`: "Simulate missed session" (marks today's scheduled session missed, creates the alert, recomputes behind status), "Switch interest" (updates the student's interests; the next rendered word problem reflects it), and an AI cost table: per session, calls, tokens in/out/cached, and cost in cents computed from the model price table in `src/coach/pricing.ts`.
- Unit tests: behind/on-track computation, cost computation, alert copy, and a test that scans the parent-facing strings under `src/app/parent/` for 'prove', 'proof', and 'verified' and fails on any hit.

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

Filled in at the end of the session.
