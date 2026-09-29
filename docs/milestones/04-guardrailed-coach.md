# Milestone 04: Guardrailed coach

Status: not started
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

Filled in at the end of the session.
