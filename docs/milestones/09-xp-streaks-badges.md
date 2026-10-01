# Milestone 09: XP, streaks, levels, badges

Status: not started
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

Filled in at the end of the session.
