# Milestone 04: Guardrailed coach

Status: done
Session: one shot

## Goal

On a wrong answer or "I'm stuck" in guided practice, a Socratic coach opens, streams a response, asks what the student tried, points to the next step, and never states the final answer or the value of x. It holds under the spec's pressure tests, escalates through at most three hint levels, then shows a similar worked example with different numbers. Every call logs tokens.

## Read first

- `docs/memo/02-mvp-spec-v1.md` §3.3, §6
- `docs/memo/01-company-memo-v1.md` §6.6
- `src/engine/solve.ts` (solution steps) and `src/db/schema.ts` (`ai_usage`)

## Scope

In:

- `src/coach/prompt.ts`: system prompt with the guardrails, the problem, the student's last answer, the correct solution steps (for the model's reference only), and the current hint level. Marked for prompt caching (`cache_control`) on the stable prefix.
- `src/coach/client.ts`: Anthropic SDK wrapper, model `claude-haiku-4-5-20251001`, `max_tokens` 220, streaming. Records `ai_usage` (input, output, cache read, cache write tokens) per call.
- `src/coach/policy.ts`: pure state machine for hint levels (1 → 2 → 3 → similar worked example), plus a deterministic output filter that redacts a leaked final value (the known solution as a number, `x = <solution>`, or the solution spelled out) before it reaches the client. Unit-tested.
- Route handler `src/app/api/coach/route.ts`: validates input with zod, streams text. Rate limit per session: 12 calls.
- Coach panel UI in guided practice: opens on wrong answer or the "I'm stuck" button, shows the streamed reply, "Try again" returns focus to the answer field.
- `scripts/coach-redteam.ts` (`npm run coach:redteam`, add the script): runs the five spec prompts plus five of your own against a real problem and writes the transcripts to `docs/eval/coach-transcripts.md` with pass/fail per case. Requires `ANTHROPIC_API_KEY`; exits non-zero on any leak.
- Unit tests: policy state machine; output filter catches the leak patterns; the route rejects malformed input. Model calls are mocked in unit tests.

Out:

- Explain-back grading, the digest, any content changes.

## Acceptance criteria

1. All spec §3.3 pressure cases pass in `docs/eval/coach-transcripts.md`, committed with the milestone. AC 3.
2. After the third hint, the panel shows a worked example with different numbers, never the current problem's solution.
3. Each coach call writes one `ai_usage` row; the admin view (07) will read it. AC 9 groundwork.
4. Streaming starts within 1.5 s on the dev server with a warm cache.
5. `scripts/gate.sh` exits 0 without an API key (unit tests mock the client; the smoke test never opens the coach).

## Smoke path

Unchanged from 03. The coach is covered by `coach:redteam`, not by the smoke test.

## Notes for the next milestone

- Coach code is in `src/coach/`. `turns.ts` is the client-safe part: the hint ladder `hintLevel(hintsUsed)` (1, 2, 3, then null for the worked example), `MAX_HINT_LEVEL`, `COACH_CALLS_PER_SESSION` = 12, `openingMessage`, `CoachTurn`, and the route's error codes `COACH_ERRORS` with `isCoachError`. `policy.ts` is the output filter (`filterTarget`, `redactSolution`, and its sentence-chunked stream form `createRedactingStream`); nothing in the browser imports it. `prompt.ts` has `coachContext(problem, interests)` (rendered problem, equation, `solutionSteps`, filter target: the one way to describe a problem to the coach, used by the route, the red-team script and the worked example) and `buildCoachPrompt`: system block 1 is the guardrails plus the session's lesson and carries `cache_control`, block 2 is the problem and reference steps, prior turns replay as user/assistant pairs, and the hint-level instruction is the last text block. `client.ts` wraps the SDK (`streamCoachReply` returns `{ deltas, usage }`; `coachConfigured` checks `ANTHROPIC_API_KEY`). `example.ts` builds the similar worked example (`similarProblem` draws seeds with `createRng` until the solution differs, so the example's last step can never be the student's answer; `exampleFor` renders it in the same interest with `{ label, equation }` steps).
- Route `POST /api/coach` takes `{ sessionId, block, index, message }` (block from `COACHED_BLOCK_IDS`, message 1 to 300 chars, control characters and angle brackets stripped so the `<student>` tag in the prompt cannot be closed from inside) and streams `text/plain`. Errors are `{ error }` JSON with codes from `COACH_ERRORS`: `invalid` 400, `not-found` 404, `closed` / `wrong-block` / `solved` / `exhausted` 409, `rate-limited` 429, `unavailable` 503. It rejects a request whose `Sec-Fetch-Site` is not same-origin. The session checks come from `openProblem(sessionId, studentId, block, index)` in `src/session/load.ts`, which `submitAnswer` uses too: the student's own session, `in_progress`, on `block`, a real problem, not yet solved. `COACHED_BLOCK_IDS` in `src/session/blocks.ts` is `["guided"]`; that is what keeps the coach out of the exit block for 06 (D33). Do not widen it.
- Storage: `coach_turns` (session, block, index, level, student text, coach text as shown, `redacted` flag; unique on session, block, index and level) and `ai_usage` now has `cache_read_tokens` and `cache_write_tokens` in place of `cached_tokens`, all in migration 0002. Every coach call writes one `coach_turns` row and one `ai_usage` row in one batch (`recordCoachTurn` in `src/db/queries/coach.ts`) after the stream ends and before it closes, so a client that waits for the end can rely on the turn being saved. Two tabs asking at once both get a reply and both calls are logged, but the unique index drops the second turn, so the ladder never skips a level; the session cap counts recorded turns, so such a race can exceed it by one call. A browser that leaves mid-reply cancels the stream; the route keeps reading the model and still records the turn and its tokens. 05's grader should log to `ai_usage` the same way with kind `explain_back`; 07 reads the four token columns per session.
- The hint level is derived on the server from the count of `coach_turns` for the problem, never from the client. `submitAnswer` stores that count on the attempt's `hints_used`, so an attempt row says how many hints the student had when they answered. `loadSession` returns `coach: { calls, turns }` (turns keyed by `problemKey`) in the same round trip.
- Client: `use-coach.ts` owns one card's conversation (turns, the streaming turn, errors, `started`, `exhausted`) and posts to the route; a stale session (`not-found`, `closed`, `wrong-block`) triggers `router.refresh()`, other codes show a message from a `Record<CoachError, ...>` table, so a new code cannot compile without one. `coach-panel.tsx` is the panel and loads through `next/dynamic` the first time a coach opens; it renders whenever the card's coach has started, including on a reload with saved turns. A reply cut off by a late error stays on screen with the error beside it. `ProblemCard` takes an optional `coach` prop, which the page sets for coached blocks and unsolved problems only. The panel stays open once opened; "Try again" only moves focus to the answer field. A wrong answer while a reply streams does not start another call. `step-list.tsx` renders solution steps for both the lesson's worked example and the coach's.
- First-load JS after this milestone: `/` and `/student` 136.1 KB, the session route 145.7 KB (was 143.3 KB) against the unchanged 150 KB budget. About 4 KB is left, so 05's explain-back panel (voice input, grading result) must also load on demand.
- Not verified here: no `ANTHROPIC_API_KEY` was on the box, so `npm run coach:redteam` did not run and `docs/eval/coach-transcripts.md` does not exist yet. AC 1 (the spec §3.3 cases) and AC 4 (streaming starts within 1.5 s) are open until someone runs it with a key and commits the transcripts; it exits non-zero on a leak. The script runs the first case alone and the other nine together.
- Prompt caching: the marker is on the stable prefix, but Haiku 4.5 only caches a prefix of 4096 tokens or more and the guardrails plus the S1 lesson are roughly 700, so `cache_read_tokens` will read 0 on this session's content. That costs under a tenth of a cent per call at Haiku's price. If the prefix ever grows past the minimum (a whole unit's lessons in the stable block, shared by every student), the columns will show it; do not pad it to get there.
- The filter replaces a leaked value with `?`. It hides `x = N` and N after a result cue ("you get", "the answer is") at any size; from 4 up it also hides N spelled out and a bare N when N is not one of the equation's own numbers (so "subtract 5 from both sides" survives when the answer is also 5, and "one side" or "step 2" survive when the answer is 1 or 2; `BARE_MINIMUM` in `policy.ts`). The stream form only emits complete sentences (a line break alone is not a boundary, so "x =" and a value on the next line are filtered together), so the panel fills a sentence at a time and re-renders a handful of times per reply.
- The similar worked example is rendered on the server for every unsolved guided problem and travels in the page payload from the first load, so a student reading the page source sees a solved example before the third hint. It is a different instance with a different answer, so nothing about their own problem leaks; if that ever matters, serve it from the route when `hintLevel` returns null.
- Student messages are stored as typed (minors' data, 300 chars max). They are for the parent transcript in 07 and the coach's own context; keep them out of logs and alerts.
- Tests: `tests/helpers/database.ts` gives a vitest file its own seeded libSQL file (`withTempDatabase`) and a `solve` helper; the session-flow and coach-route tests both use it, and 05's grading tests should too.
