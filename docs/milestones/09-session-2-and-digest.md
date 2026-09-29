# Milestone 09: Session 2 content and weekly digest

Status: not started
Session: one shot

## Goal

Session 2 (variables on both sides) is real content built to the same standard as S1, and the weekly parent digest generates from session logs with the larger model.

## Read first

- `docs/memo/02-mvp-spec-v1.md` §2 (S2), §3.6
- `src/content/algebra1/linear-equations/s1.ts` and `docs/content-review.md` from 03

## Scope

In:

- `src/content/algebra1/linear-equations/s2.ts`: warm-up drawn from S1 structures (spaced retrieval), stepped lesson with one fixed worked example, 5 guided problems with at least 3 interest-framed word problems (7 variants each), 3 exit problems with at least 1 word problem. Same tests as S1. `docs/content-review.md` updated.
- Session planner serves S2 after S1 is mastered, S1 again if it is in Repeat.
- `src/coach/digest.ts`: builds a week's summary from `session_logs`, `attempts`, `explain_backs`, and `mastery` for one student and asks `claude-sonnet-5-5` (max_tokens 400, JSON schema: `sessions_done`, `concepts_mastered`, `strength`, `gap`, `talking_point`) for the narrative fields only; the counts come from the database, never from the model. Logs `ai_usage`.
- `/parent/digest`: renders the latest digest; a "Generate this week's digest" action on `/admin` runs it against seeded data.
- Unit tests: digest input assembly from fixtures; zod parsing of the model output; counts are database-derived even if the model returns different numbers.

Out:

- Session 3 (only if time remains after 10), email delivery.

## Acceptance criteria

1. The weekly digest generates from seeded data. AC 8.
2. S2 meets every S1 content test.
3. `scripts/gate.sh` exits 0 without an API key.

## Smoke path

Master S1 → `/student` offers S2 → S2 warm-up shows a two-step equation → guided practice shows a variables-on-both-sides word problem framed for the student's interest.

## Notes for the next milestone

Filled in at the end of the session.
