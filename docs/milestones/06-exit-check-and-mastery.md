# Milestone 06: Exit check and mastery state

Status: not started
Session: one shot

## Goal

Block 5 works and the mastery rule is enforced. Three new problems, 90 seconds each, no coach, no hints. Pass is at least 2 of 3 correct and the explain-back passed; the concept is marked mastered. Otherwise the concept is marked Repeat and the next session reflects it. Timer modes change the clock, never the rule.

## Read first

- `docs/memo/02-mvp-spec-v1.md` §3.2 block 5, §3.1 (accommodation setting), §8 items 5 and 11
- `src/db/schema.ts` (`students.timer_mode`, `session_logs.status`)

## Scope

In:

- `mastery` table or column set: per student per concept, `status` (`mastered | in_progress | repeat`), `updated_at`, `evidence` (session_log id, exit score, explain-back id).
- Exit-check UI: one problem at a time, a visible countdown (90 s × 1 for standard, × 1.5 for extended, hidden and unlimited for untimed), auto-submit on expiry as incorrect, no coach button rendered in this block.
- Session completion: computes the verdict server-side from persisted attempts and the explain-back verdict (never from client state), writes `mastery`, sets `session_logs.status` to `done` and records `mastered` or `repeat` on the log. A session is completed only when all three block-5 attempts are persisted with `hints_used = 0` and no coach call in block 5; otherwise `session_logs.status` stays `in_progress`. This is the completion definition every later count uses (D33).
- Session planner: `src/db/queries/sessions.ts` picks the next session for a student; a `repeat` concept comes first; the student page says "Today: repeat two-step equations".
- Unit tests: verdict rule (all combinations of exit score and explain-back pass), timer multiplier by mode, planner ordering.

Out:

- Parent view, alerts, onboarding.

## Acceptance criteria

1. Failing the exit check marks the concept Repeat and the next session reflects it. AC 5.
2. The extended-time setting changes the exit-check timers without changing the mastery rule. AC 11.
3. The verdict cannot be forged from the client; a request to complete a session with fewer than three persisted exit attempts, or with any block-5 attempt where `hints_used > 0`, is rejected.
4. `scripts/gate.sh` exits 0.

## Smoke path

Complete a session end to end with correct answers → "Mastered". Seed a second student with `timer_mode: extended` and assert the countdown starts at 135 s.

## Notes for the next milestone

Filled in at the end of the session.
