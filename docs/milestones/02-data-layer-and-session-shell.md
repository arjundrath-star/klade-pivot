# Milestone 02: Data layer and session shell

Status: done
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

- Content lives in `src/content/algebra1/linear-equations/s1.ts` as a `SessionContent` (`src/content/types.ts`): `warmup`, `learn { explanation, example { template, seed } }`, `guided`, `exit`. It is a two-problem fixture today (one symbolic two-step in warm-up, one word two-step in guided, `exit: []`). 03 replaces the data in that file; `src/content/sessions.ts` maps the `content_key` on each `session_templates` row to it (`S1_KEY`), and `sessionContent` throws on an unknown key.
- Problem seeds: `problemSeed(sessionSeed, block, index)` in `src/session/problems.ts` hashes the position, so growing warm-up to 3 problems does not change guided or exit seeds. Every attempt stores `template_key` and `seed`; `generateInstance(template, seed)` rebuilds the instance.
- Gating is `isBlockComplete` in `src/session/blocks.ts`: blocks in `ANSWERED_BLOCK_IDS` (`warmup`, `guided`) need a correct attempt on every problem; every other block is always complete. That function is the one place to add 03's "I've read this" gate, 05's explain-back pass and 06's exit rule (answered, 2 of 3). Do not add `exit` to `ANSWERED_BLOCK_IDS`: "all correct" would trap a student who fails the exit check. The server decides completeness in `moveBlock` from the database; the client check only enables the button.
- Panels: `page.tsx` renders each block's panel on the server and passes them to `SessionRunner` as `panels: Record<BlockId, ReactNode>`. Answers never reach the browser. 03 swaps the `learn` stub for the lesson; `ProblemCard` reports solves through `useSolved()` context.
- Server actions in `src/app/student/session/[id]/actions.ts` return typed results. `submitAnswer` does not record input that is not a number and clamps `time_ms` at one hour. Every load goes through `loadSession(id, DEMO_STUDENT_ID)`, which filters on the student. When sign-in lands, replace `DEMO_STUDENT_ID` where the session page, the session actions and `/student` read it.
- Timer: `session_logs.block_elapsed_ms` keeps time per block across Back/Next and reloads; `blockBudgetSeconds` gives 1.5x for `extended` and null for `untimed`. It is display only. 06's 90-second per-problem exit timer must be enforced on the server, not from this clock.
- Database: local `file:` URLs migrate on first connection (`src/db/migrate.ts`); a hosted URL needs `npm run db:migrate` at deploy (milestone 10). `drizzle/meta/` is now committed, since the migrator needs `_journal.json`. `npm run db:seed` and `db:reset` (delete the local file, then seed) read `.env.local`; `db:reset -- --open-session` also opens Maya's session and prints its path.
- Smoke and Lighthouse each get a fresh database (`data/smoke.db`, `data/lighthouse.db`). Smoke specs read answers through `tests/helpers/answers.ts`. Lighthouse covers `/`, `/student` and one opened `/student/session/[id]`: all three scored 100/100/100.
- First-load JS: Next 16's build output no longer prints route sizes, so the 150 KB rule is not enforced by the gate. Measured by hand from the built HTML, gzipped and excluding the `noModule` polyfill: `/` 130 KB, `/student/session/[id]` 137 KB. A size check in `scripts/lighthouse.mjs` (sum script transfer size from the report) would close this gap.
