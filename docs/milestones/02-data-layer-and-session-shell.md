# Milestone 02: Data layer and session shell

Status: not started
Session: one shot

## Goal

A student can open a session and move through its five blocks with a visible progress bar and block timer, and every attempt is persisted. The content is a temporary two-problem fixture; real content lands in 03.

## Read first

- `docs/memo/02-mvp-spec-v1.md` §3.2, §7
- `src/engine/` from milestone 01
- `CLAUDE.md` Runtime rules (server components, streaming, `src/db/` only)

## Scope

In:

- `src/db/schema.ts` with Drizzle tables from spec §7: `families`, `students` (name, grade, target_date, pace, timer_mode `standard | extended | untimed`, interests JSON), `courses`, `units`, `session_templates`, `session_logs` (status `scheduled | in_progress | done | missed | repeat`), `attempts` (student, problem key, seed, answer, correct, time_ms, hints_used, block), `explain_backs`, `alerts`, `ai_usage` (call kind, model, input_tokens, output_tokens, cached_tokens, session_log_id). Indexes on every foreign key and on `session_logs(student_id, started_at)`.
- `src/db/client.ts` (libSQL client from `DATABASE_URL`), `src/db/queries/*.ts` (one file per aggregate; no raw SQL outside `src/db/`).
- `npm run db:generate` produces `drizzle/0000_*.sql`; migrations are applied automatically on first connection in dev and CI (`src/db/migrate.ts`), so a fresh clone runs with zero setup.
- `scripts/seed.ts` (run with `npm run db:seed`, add the script): two demo accounts, a parent and a student "Maya", grade 6, target date next May, pace 4/week, interests sports + music, timer standard. Idempotent.
- Session shell at `src/app/student/session/[id]/`: server component loads the session log and template; a client `SessionRunner` walks the five blocks (warm-up, learn, guided practice, explain-back, exit check) with a progress bar, a block timer, and Next/Back gated so a block cannot be skipped. Blocks 2, 4 and 5 render a labeled stub panel this milestone; blocks 1 and 3 render problems from the engine, accept an answer, grade it with `check`, and persist an `attempt` through a server action.
- `src/app/student/page.tsx`: today's session for the seeded student, with a Start button that creates the `session_log` and redirects.

Out:

- Real lesson content, the coach, voice, grading rubric, parent view, onboarding, auth.

## Acceptance criteria

1. Fresh clone, `npm ci`, `npm run db:seed`, `npm run dev`: `/student` shows Maya's session, Start opens it, all five blocks are reachable in order, the progress bar and timer update.
2. Answering a warm-up problem persists an `attempts` row with `correct`, `time_ms`, and `seed`. Reloading the page resumes at the same block.
3. The session page ships no client JS for blocks that are not interactive; `next build` output shows the session route under 150 KB first-load JS.
4. Unit tests cover the block state machine (order, gating, resume).
5. `scripts/gate.sh` exits 0.

## Smoke path

`/student` → Start → block 1 renders a problem → submit a wrong answer, see it marked wrong → submit the right answer → Next → block 2 stub → Next through to block 5 → session shows Done.

Add `/student` to `ROUTES` in `scripts/lighthouse.mjs`.

## Notes for the next milestone

Filled in at the end of the session.
