# Milestone 06: Exit check and mastery state

Status: done
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

- Completion is one function: `completeSession(sessionId, studentId)` in `src/session/complete.ts`. It loads the session, refuses unless the log is `in_progress` on the exit block with a final explain-back and an attempt on every exit problem (`incomplete`), refuses any exit attempt with `hints_used > 0` or any `coach_turns` row on an exit problem (`aided`), computes the verdict with `masteryVerdict` (`src/session/mastery.ts`: at least `EXIT_PASS_MARK` = 2 of 3 right and explain-back `passed`), then `finishSession` in `src/db/queries/sessions.ts` sets the log to `done` with `outcome` (`mastered | repeat`) and upserts the `mastery` row in one batch. A refused request leaves the session `in_progress`. XP, streaks, unlocks and the parent alert (07, 08) attach here, after `finishSession` returns true. `moveBlock` calls it on Next from the exit block and returns `{ ok: true, to: "done", summary }`.
- Storage (migration 0004): `mastery` (student, session template as the concept, `status` `mastered | in_progress | repeat`, evidence `session_log_id`, `exit_score`, `explain_back_id`, `updated_at`; unique on student and template). Opening a session writes `in_progress` with `onConflictDoNothing`, so a Repeat mark stays until the repeat session decides it. `session_logs.outcome` holds the verdict. `exit_shown` records when the server first sent each exit problem. `attempts` has a partial unique index (`session_log_id`, `problem_index`) where `block = 'exit'`, so each exit problem takes exactly one attempt even across tabs. The old `repeat` value in `session_logs.status` is unused; status is `done` and the verdict is in `outcome`.
- Exit check flow: `exit` is not in `ANSWERED_BLOCK_IDS` and `COACHED_BLOCK_IDS` is still `["guided"]`. `SessionProgress.exitAnswered` (count of exit attempts, from `loadSession`) gates the block: `isBlockComplete("exit")` is true once every problem has its attempt, right or wrong. `ProblemCounts` now covers all three problem blocks. The page renders only the next unanswered exit problem, only while the log is on the exit block, through `renderSessionProblem`; rendering it calls `markExitShown`, which starts the clock and keeps the first time, so a reload shows the time left, not a fresh 90 s. The runner refreshes on explain to exit (same pattern as 05). Each exit answer calls `router.refresh()`: the runner is not remounted (its key is unchanged), it reads `exitAnswered` as a live prop, and the exit card remounts because it is keyed by problem index.
- Deadline: `submitExitAnswer` in the session actions computes elapsed time from `exit_shown`, never from the client. Late is `isExitAnswerLate` in `src/session/timer.ts`: past `exitProblemSeconds(mode)` (90, 135 for extended, null for untimed) plus a 2 s transit allowance. A late answer, or one the browser sends with `expired: true` when its countdown hits zero, is stored as incorrect. An on-time answer that is not a number is not recorded (the clock keeps running). `time_ms` on exit attempts is the server's elapsed time, clamped at an hour.
- Back is refused from the exit block (`step` returns `exit-check`): the lesson's worked example is one block away, so the check is closed-book. The Back button is disabled there.
- Planner: `findTodaySession` returns the open session first, then any concept marked `repeat` (course order), then the first concept not `mastered`. It used to skip templates with a `done` log; now a done log with outcome `repeat` brings the concept back. Both open and next carry `repeat: boolean`, and `/student` shows "Today: repeat two-step equations".
- Client: `exit-check.tsx` is a `next/dynamic` wrapper (`ssr: false`) for `exit-panel.tsx` (answer field and a display-only countdown that ends in an auto-submit). The problem text is server markup. First-load JS on the session route is 147.5 KB (was 146.4 KB), so the 150 KB budget was not raised. `SessionComplete` shows "Mastered" or "This concept repeats next session." with the exit score; a log finished before this migration has no outcome and shows the old screen.
- Smoke: the main test finishes Maya's session with three correct exit answers and expects "Mastered". There is no sign-in, so the browser can only be Maya: the extended-time test switches Maya to `extended` and opens a session already on the exit block (`sessionAtExit` and `setTimerMode` in `tests/helpers/answers.ts`), checks "2:15 for each problem" and a countdown at 2:1x, fails the check and expects the Repeat screen and "Today: repeat two-step equations". The deadline itself (120 s on time and 140 s late for extended, 95 s late for standard, two hours on time for untimed) is covered in `tests/unit/db/exit-check.test.ts`, along with the D33 refusals and planner ordering.
- Known limits, deliberately left: (1) The browser countdown starts when the exit panel mounts, from the time left at server render, so a slow full reload (hydration plus the panel chunk) shows up to that delay more time than the server allows; the 2 s transit allowance absorbs a normal load, and the client is told only "recorded", never "late". Sending the server's deadline with its clock offset would close it. (2) A session with an aided exit attempt can never complete (D33 says it stays `in_progress`) and the student sees the reload message. The app cannot produce one today (the coach route refuses the exit block, so `hints_used` is always 0 there), but if exit ever gets help, it needs a recovery path first. (3) Logs finished before migration 0004 have no `outcome` and no `mastery` row, so the planner offers that concept again. Only dev databases have such logs; there is no hosted database yet.
- For 07: the parent view reads `mastery` (status and evidence) and `session_logs.outcome`. The kid's explanation is `mastery.explain_back_id`.
