# Milestone 09: XP, streaks, levels, badges

Status: done
Session: one shot

## Goal

Effort the kid can see. Completing blocks and sessions earns XP, finishing scheduled sessions on time builds a streak with one banked freeze, mastering a concept earns a badge, and the parent sees the streak next to the on-track line. Built for real on data that already exists; nothing here is seeded.

## Read first

- `docs/memo/08-mvp-steering-oct1.md` §3.2 (XP rules) and §5 (mock policy)
- The single completion function named in the 06 notes; the session days and start time from the 08 notes
- `src/db/schema.ts` (`attempts`, `explain_backs`, `session_logs`, `mastery`)

## Scope

In:

- `src/engine/progress.ts`: pure functions. XP table as a named constant: warm-up block complete 10, each guided problem solved 5, explain-back pass 25, exit check pass 50. Streak: consecutive scheduled sessions completed on their scheduled day per the pace plan (never calendar days), with one banked freeze that covers one missed scheduled session and is restored after five on-time sessions. Level: 1 plus units mastered. Badges, data-driven from the unit's concept list: "<concept> mastered" on an exit pass, "Unit 1 Mastered" when every concept in the unit has a mastery row (with one concept shipped the two fire together; the copy must not claim more), "5-session streak", "Explained it perfectly" (3 of 3 on every rubric score). XP comes from work completed and gates passed, never from speed or scores.
- Tables `xp_events` (student, session_log, kind, amount, created_at; unique on session_log and kind) and `badges` (student, key, earned_at; unique on student and key). Awards attach at block completion in the server actions and at the completion function from 06; every award is idempotent so a replayed action never double-counts.
- Kid view on `/student`: XP bar with level, streak flame with the count, badge shelf. The session-complete panel shows what this session earned (XP, streak change, badges); any client code for it loads on demand so the session route stays under budget.
- Parent view on `/parent`: streak count and freeze state beside the on-track line.
- Unit tests: XP table, streak with and without the freeze across a scheduled-day fixture, badge rules, idempotency of awards.

Out (do not build, even if tempting):

- Rewards, the screen-time gate, the mentor, leaderboards, any cash or physical reward.

## Acceptance criteria

1. Completing a session awards XP and updates the streak; passing the exit check awards the concept badge and, with one concept shipped, the unit badge. Steering AC 13.
2. Replaying a completion or re-submitting a block awards nothing twice.
3. `scripts/gate.sh` exits 0 without an API key.

## Smoke path

Complete a session end to end (explain-back pass written through the smoke helper) → the completion screen shows the XP earned, streak 1, and the badges → `/student` shows the XP bar, level and shelf → `/parent` shows the streak.

## Notes for the next milestone

- Pure rules: `src/engine/progress.ts`. `XP_TABLE` (warmup 10, guided 5 per problem, explain 25, exit 50), `streak(slots, completedDays, today)`, `level`, `currentUnit`, `allBadges`, `earnedBadges`. A badge is a plain `{ key, label, detail }`; the rules that earn them live in one private list, so the shelf and the awards cannot drift. Copy (`XP_LABELS`, `streakLabel`, `freezeLabel`) is in `src/parent/progress.ts` with the rest of the progress wording. `ScheduleSlot` moved to `src/engine/pace.ts`.
- Streak: walks the planned schedule (`plannedSlots`, so the stored rows carried on over `session_days`) up to today. A schedule day with a `done` session completed on it (family calendar day, `sessionActivity`) extends the streak, even if the day was marked missed first. A past day without one, or today once marked missed, spends the freeze if banked, else resets to 0; a miss with no streak to protect changes nothing. Today still open counts for nothing. The freeze starts banked; `untilFreeze` is the on-time sessions still needed to bank it again (0 means banked, 5 after a use). Off-schedule sessions never count. `session_time` does not change the streak: a session counts anywhere in its day. 10's lock is where the time matters.
- Storage (migration 0007): `xp_events` (student, session_log, kind, amount; unique on session_log and kind) and `badges` (student, key, session_log, earned_at; unique on student and key; `session_log_id` is the session that earned it, so the end screen can show it again on reload). Every award is `onConflictDoNothing`.
- Where awards attach: `moveBlock` pays the block being left with Next (`blockXp` in `src/session/rewards.ts`, written in the same `moveSession` batch as the move) when the stored progress says it is complete: warm-up, guided (5 x guided problems), explain-back only when `passed` (an admin override counts as passed and pays; it never earns "Explained it perfectly" since its scores are zero). `completeSession` works out `sessionAwards` before finishing and `finishSession` writes them in its batch with the log and the mastery row, so a failure cannot close a session without its awards: exit XP at 2 of 3 or better (even when the explain-back failed and the concept repeats), and every badge the student qualifies for once the session is done (`earned_at` is the session's `completedAt`). The mastery alert is still a separate write after it. The concept badge fires on mastery (exit pass and explain-back pass), not on an exit pass alone, since "mastered" would otherwise be false.
- Unit and concept list: `ALGEBRA1_CONTENT` and `ALGEBRA1_BADGES` in `src/content/algebra1/concepts.ts`. The seed writes the unit and template titles from it. Adding a concept means a `SESSIONS` entry, a `ALGEBRA1_CONTENT` concept and a seed template row. The unit badge reads "Unit 1 Mastered" with the detail "Every concept Unit 1 has so far: 1 of 1." Levels and badges read Algebra 1 only; a second course needs the outline built from the student's course rows.
- Screens: the end screen (`session-complete.tsx`) shows this session's XP by kind, the streak after it (counting only sessions finished before it, so a reload reads the same) against the streak going into that day, whether an earlier session already counted for the day, and the badges this session earned. Known limit: a reload rebuilds the change from the current `session_days`, so changing the weekdays later can change an old end screen. The runner loads it with `next/dynamic` and starts the download when Finish is pressed; a reload renders it on the server from `sessionRewards`. `/student` has a server-rendered `ProgressPanel`: level and total XP, a bar of the current unit's concepts mastered, the streak flame and freeze, and the full badge shelf. `/parent` shows the streak and the freeze beside the on-track line.
- Demo: Maya's seed has `session_days` (Mon, Tue, Thu, Sun) but no schedule rows, and `plannedSlots` treats no rows as no schedule, so on a fresh `db:reset` her streak cannot move. The smoke spec adds today's row (`scheduleToday` in `tests/helpers/answers.ts`). For the Oct 2 demo (a Friday, not one of her days), 12 must seed a scheduled row for the demo day, or the end screen says "This was not a scheduled session day". Decide that together with the "Simulate missed session" rehearsal note from 08.
- First-load JS (Lighthouse, gzipped): session route 148.3 KB (unchanged: the end screen moved out of the first load, its prefetch on Finish came in), `/student`, `/parent`, `/admin` and `/` 141.5 KB, `/onboarding` 143.0 KB. The 150 KB budget was not raised. Review items left: `/student` and `/parent` read the student row twice per render (once directly, once inside `studentStanding`).
- Tests: `tests/unit/engine/progress.test.ts` (XP table, streak with and without the freeze on a Mon/Wed/Fri fixture, badges, levels) and `tests/unit/db/rewards.test.ts` (a full session through the actions, two tabs pressing Next, back and forth, replayed completion, a failed explain-back, a sub-pass exit). `recordPass` takes rubric scores. The smoke main test checks the end screen before and after reload, `/student` and `/parent`.
