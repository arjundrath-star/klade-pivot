# Milestone 11: Rewards panel and mentor cards (seeded mocks)

Status: done
Session: one shot

## Goal

The two premium ideas appear as prototype features: a rewards panel showing progress toward completion rewards paid in our own product, with one seeded reward unlocking live when the demo session completes, and a college-student mentor card on the kid and parent views. Seeded data, labeled prototype, never on the core loop's path.

## Read first

- `docs/memo/08-mvp-steering-oct1.md` §3.3, §4.1, §5, §6 (acceptance checks 14, 19, 20, 21), §7 steps 4 to 6
- 06 notes (completion function), 09 notes (streak), 10 notes (phone panel toast pattern)

## Scope

In:

- Naming: the human is the "mentor" in every UI string ("Your mentor: Jordan · NYU '28"); "coach" stays the AI hint coach. The pitch may say college-student coach; the product does not.
- `src/content/rewards.ts`: reward definitions from the steering §4.1 table (finish the course by the target date; finish a unit on or ahead of deadline; 4-week streak; hit Intensive pace), each with a parent-facing and a kid-facing line and a cap note. `reward_progress` rows seeded per student (current, target) and `reward_unlocks` (student, key, unlocked_at; unique). Progress uses real data where it exists (streak weeks from 09, on-track from 07) and seeded values otherwise; the file says which is which.
- Kid Rewards panel on `/student`: progress bars toward at least two rewards; the "4-week streak" reward seeded at 3 of 4 so that completing the demo session unlocks it, with a notification in the completion screen. The unlock attaches at the 06 completion function next to XP and is idempotent.
- Parent view lines on `/parent`: "On pace: finish by <target> → first month of Geometry free" and "Earned: <reward>" when unlocked.
- Mentor card, kid: name, school and year, next check-in time, a seeded note that quotes the student's latest explain-back verbatim from the database, and Join → `/mentor/waiting-room`, a static mock page. Mentor card, parent: name, last check-in summary (seeded), next check-in. Both labeled "Premium · prototype".
- Stretch, only if the milestone is otherwise done inside the hour: `/mentor/dashboard` with five seeded students, one flag each (missed sessions, weak explain-back, streak at risk) and a one-line "talk about this" suggestion.
- Unit tests: reward progress computation, unlock idempotency, seeded data shape.

Out (do not build, even if tempting):

- Booking, video, payments, a mentor marketplace, any cash or gift-card reward, discounts applied to real billing.

## Acceptance criteria

1. Mentor card renders on kid and parent views with seeded data; Join opens the mock waiting room. Steering AC 14.
2. Rewards panel renders on kid and parent views with progress toward at least two rewards. Steering AC 19.
3. Completing the demo session advances reward progress and one seeded reward unlocks with a notification. Steering AC 20.
4. With the seed rows missing, every core-loop route renders and the smoke path from 06 still passes. Steering AC 21.
5. `scripts/gate.sh` exits 0.

## Smoke path

`/student` shows the rewards panel at 3 of 4 and the mentor card → complete the session (smoke helpers) → the completion screen shows the reward unlock → `/parent` shows "Earned" and the mentor card → Join → the waiting room renders.

Add `/mentor/waiting-room` to `ROUTES` in `scripts/lighthouse.mjs`.

## Notes for the next milestone

- Rewards: definitions and the pure rules are in `src/content/rewards.ts` (`REWARDS`, `reachedRewards`, `rewardBoard`); its header says which progress is real and which is seeded. Each reward's `live` names the real number added to its seeded row. `streak-4-weeks`: the seeded weeks plus `streakSpan(...).weeks` (calendar weeks, Monday to Sunday, the current streak has a session in; `src/engine/progress.ts`, given the count from 09's `streak`, since the streak's sessions are its last `count` completed schedule days). Once a streak in the record has ended (`broken`), the seeded weeks stop counting, so a break cannot be followed by an unlock after one week. `course-on-time` and `unit-on-time`: the seeded sessions plus every session finished; the course's pace line is real (`studentStanding`, 07). `intensive-pace` is the seeded row alone (0 of 4 for Maya, who is on the on-track plan). Nothing touches billing.
- Storage (migration 0009): `reward_progress` (student, key, current, target; unique on student and key), `reward_unlocks` (student, key, session_log, unlocked_at; unique on student and key, indexed on the session), `mentors` (first name, school, class year) and `mentor_assignments` (one per student: weekday and time of the 10-minute check-in, the seeded parent summary, the seeded note). `seedDemo` upserts Maya's four reward rows (streak at 3 of 4, course and Unit 1 at 5 sessions, intensive at 0 of 4) and Jordan, NYU '28, Thursdays at 7:00 PM; a re-seed keeps unlocks. The seed's parent is also named Jordan; nothing shows the parent name, but rename one before it does.
- Unlock: `rewardRows` reads the rows joined to `reward_unlocks` (one query, an `unlocked` flag per row). `sessionAwards` reads them beside the streak record and returns `unlocks`, the keys not yet unlocked that the streak after the session puts at their target; `finishSession` writes them in its batch with `onConflictDoNothing`, so a replay or a second tab stores one row. A student without rows unlocks nothing, which is how a newly onboarded student and a database without the seed rows stay on the 06 path. `sessionRewards` reads unlocks back by session, so the end screen shows "Reward unlocked: ..." on reload like the badges. An unlocked reward reads full on the board even if the streak later breaks, and drops its pace lines. Like the XP and badge inserts beside them, the unlock inserts do not depend on the close matching; only another completion of the same session can race it today, and it writes the same rows.
- Demo: the unlock needs the session day on Maya's schedule (same as the streak, 09 notes). For Oct 2, 12 must seed a scheduled row for the demo day. Any session closed as done on a schedule day starts the streak, and the board then reads 4 of 4 before the demo session (unlocked only by `completeSession`), so rehearse from `npm run db:reset`.
- Mentor: `MentorCard` (`src/mentor/mentor-card.tsx`) renders on `/student` (note, Join) and `/parent` (last check-in summary) right after `PhoneSection`, both labeled "Premium · prototype". The kid's note quotes `latestExplanation`, the parent view's query, word for word; an override (no text) or no explanation yet shows the seeded note alone. Next and last check-in are worked out from the weekday and time in the family's time zone (`src/mentor/check-in.ts`); a check-in stays "next" until its 10 minutes are over. `/mentor/waiting-room` is a static page with the safeguards from steering §3.3 in plain words. The stretch `/mentor/dashboard` was not built.
- UI: everything is server-rendered; no new client chunk. The prototype palette is Tailwind theme tokens in `globals.css` (`dusk`, `dusk-high`, `marigold`, `mint`, and the `bg-dusk-glow` utility); the phone panel, the rewards panel, the mentor card, the waiting room and the end screen's unlock all read them. `tests/unit/parent/wording.test.ts` now also scans `src/content/rewards.ts`, `src/rewards` and `src/mentor`.
- First-load JS (Lighthouse, gzipped): `/student` 147.0 KB (was 143.0; the Join link prefetches the waiting room route), `/parent` 147.1 KB (unchanged), `/mentor/waiting-room` 141.5 KB, the session route 148.3 KB (unchanged). The 150 KB budget was not raised. All routes 100/100/100.
- Tests: `tests/unit/content/rewards.test.ts` (progress, cap, board, definitions never pay cash), `tests/unit/engine/progress.test.ts` (`streakWeeks` across weeks, freeze, break), `tests/unit/mentor/check-in.test.ts` (time zone, today vs next week), `tests/unit/db/completion-rewards.test.ts` (seeded shape, unlock on a scheduled day, none off schedule, idempotent on replay and a second session, re-seed keeps the unlock, completion with the rows deleted). Smoke `tests/smoke/mentor.spec.ts` runs before `parent.spec.ts` (whose cleanup closes a session done today and so starts the streak): rewards at 3 of 4, mentor card, Join to the waiting room, the parent lines, and both views with the rows deleted. `session.spec.ts` checks the unlock on the end screen before and after reload, 4 of 4 on `/student`, the verbatim quote in the mentor note, and "Earned: one free mentor check-in" on `/parent`.
