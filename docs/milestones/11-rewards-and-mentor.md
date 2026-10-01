# Milestone 11: Rewards panel and mentor cards (seeded mocks)

Status: not started
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

Filled in at the end of the session.
