# Milestone 05: Explain-back and rubric grader

Status: done
Session: one shot

## Goal

Block 4 works. The student picks or is assigned one solved problem and explains why each step works, by voice in Chrome or by typing. A rubric grader returns three scores, a verdict, and specific feedback in under five seconds. Below threshold requires one retry. Integrity signals are logged.

## Read first

- `docs/memo/02-mvp-spec-v1.md` §3.2 block 4, §5 (rubric), §6
- `src/coach/client.ts` (reuse the wrapper and usage logging)

## Scope

In:

- `src/coach/grader.ts`: grades an explanation against the rubric using `claude-haiku-4-5-20251001` with a JSON schema response (`correctness`, `justification`, `precision` each 0 to 3, `feedback` one or two sentences naming the missing "why"). Parsed and validated with zod; a malformed response is retried once, then fails closed with a visible error, never a silent pass. Pass rule: total ≥ 5 and correctness > 0. Logs `ai_usage`.
- Explain-back block UI (client component): shows the chosen problem and the student's own steps from their attempt; a text area; a microphone button that uses the Web Speech API when available (feature-detected, Chrome only), appends transcripts live, and falls back to typing elsewhere. Submit → grading → scores and feedback → "Try once more" on fail → second result is final.
- Integrity signals stored on `explain_backs`: `source` (`voice | typed`), `pasted` (paste event fired in the field), `duration_ms`, `chars_per_second`. Never shown to the student.
- Unit tests: pass rule, zod parsing of good and bad grader output, retry-then-fail-closed behavior (mocked client).

Out:

- Any change to grading thresholds, server-side audio, the parent view.

## Acceptance criteria

1. Typed explain-back returns scores and feedback in under 5 s on the dev server. AC 4.
2. In Chrome, the microphone button transcribes speech into the field; in a browser without the API, the button is hidden and typing works.
3. A failing first attempt requires exactly one retry; the second result stands.
4. `scripts/gate.sh` exits 0 without an API key.

## Smoke path

Session through block 4: the explain-back field accepts typed text; with `ANTHROPIC_API_KEY` unset the smoke test submits and expects the visible "grading unavailable" error state, not a pass. (The smoke test must never depend on a live model.)

## Notes for the next milestone

- Rubric and pass rule live in `src/coach/rubric.ts` (client-safe): `passes` (total at least 5 of 9 and correctness above 0), `EXPLAIN_ATTEMPTS` = 2, `explainStatus(verdicts)` giving `pending | retry | passed | failed`, and `isExplainFinal`. `SessionProgress.explainBack` carries that status, derived on the server from the `explain_backs` rows in `loadSession`. `isBlockComplete("explain")` is true once the status is final, so a failed retry still moves the student to the exit check. 06's mastery rule should read `progress.explainBack === "passed"`, never the block's completeness.
- The grader is `src/coach/grader.ts`. It makes one Haiku 4.5 call with `output_config.format` (JSON schema, integer enum scores 0 to 3, feedback first), then zod-validates the reply in `parseGrade`. A reply that did not stop on `end_turn`, or does not parse, is retried once. A second failure, or an API error, returns `{ ok: false }`. The client wrapper is `requestGrade` in `src/coach/client.ts`: 5 s timeout, no SDK retry, so the worst case is two calls of about 5 s each before "grading unavailable". The rubric is the cached system block, about 450 tokens, under Haiku's 4096-token cache minimum, so `cache_read_tokens` will read 0 here too.
- The action is `submitExplanation` in `src/app/student/session/[id]/actions.ts`. The server picks the problem, numbers the attempt, and applies the pass rule to the scores; the model's opinion of pass or fail is never asked. Failure codes: `invalid`, `closed`, `wrong-block`, `graded` (already final, or another tab recorded the attempt), `unavailable` (no key, unreachable, or malformed twice), and `rate-limited` (`GRADER_CALLS_PER_SESSION` = 8, counted from `ai_usage` rows of kind `explain_back`). Every grader call, including malformed ones, writes an `ai_usage` row with the four token columns. A graded attempt writes its row in the same batch (`recordExplainBack` in `src/db/queries/explain.ts`).
- Student text for prompts now goes through `untrustedText(max)` in `src/coach/prompt.ts` (the coach route uses it too): control characters and angle brackets are stripped, so the text cannot close its `<explanation>` or `<student>` tag. Explanations are capped at 1500 characters.
- Storage: migration 0003 rebuilt `explain_backs`, which had never been written to. It now has the problem (block, index), `attempt` (unique per session), the text, three score columns, feedback, verdict (`pass | fail`), and the integrity signals `source`, `pasted`, `duration_ms` (from the first edit to submit, clamped at an hour) and `chars_per_second` (computed on the server; under a second counts as one). The student never sees the signals. 07 reads them in aggregate and shows `text` as "the kid's own explanation". `ai_usage`'s index is now `(session_log_id, kind)`.
- Which problem gets explained: the guided problem with the most coach turns, the latest on a tie. Once a row exists, it is the problem already explained. Attempts store only final answers, so "the student's own work" on screen is the problem and the answer they reached; the reference steps go to the grader only.
- Answer safety: `page.tsx` still renders every block's panel up front. The explain panel shows a solved answer, so it renders only once guided practice is complete. The runner calls `router.refresh()` (and preloads the panel chunk) when it moves from guided to explain. That is a special case. If 06 or later panels need server state that changes during the session, the general fix is to render only the current block's panel and refresh from `moveBlock`. A review recommended that change; it was deferred because it changes the runner's design from 02.
- Client: `explain-back.tsx` is a small `next/dynamic` wrapper (`ssr: false`); `explain-panel.tsx` (text area, Web Speech API microphone, results, "Try once more") loads when block 4 first renders. The microphone is feature-detected with `useSyncExternalStore` (`SpeechRecognition` or `webkitSpeechRecognition`), so it is hidden on the server and in browsers without the API. First-load JS on the session route is 146.4 KB (was 145.7 KB), so the 150 KB budget was not raised.
- Smoke: Playwright starts the server with `ANTHROPIC_API_KEY` empty. The session test types an explanation, submits, and expects the visible "Grading unavailable" error with Next still locked. It checks voice with a stand-in recognizer that appends a transcript, and checks that a context without the API has no Speak button. It then writes a graded pass straight to the database (`recordPass` in `tests/helpers/answers.ts`) and reloads to finish the session. No browser test covers a live grade unlocking Next without a reload; the unit tests in `tests/unit/db/explain-back.test.ts` cover that path on the server.
- Known limits, deliberately left: (1) Fail-closed means a session with no API key, a long outage, or 8 grader calls used stays on block 4; there is no parent or admin override yet. 07 or 10 should add one before real families use it. (2) A call that times out writes no `ai_usage` row (its tokens are unknown), so it does not count toward the cap. (3) The cap is checked before grading, so parallel submits from one client can each spend calls; the unique attempt index keeps the stored results right. (4) The verdict is not streamed: it is shown only after zod validates it, since a partly shown score cannot fail closed. A malformed first reply can push the wait past 5 s. (5) The runner's key now includes the explain-back status, so a result recorded in another tab remounts the runner on refresh.
- Integrity signals not built: "explanation that doesn't match the student's own work" (spec §5) needs the student's steps, which attempts do not record.
- Not verified here: there is no API key on the box, so AC 1 (a typed explain-back graded in under 5 s on the dev server) and grading quality on real explanations are open. Someone with a key should grade five or so real explanations (good, steps-only, off-topic, an injection attempt, a spoken transcript) and check the scores against §5 before the demo.
