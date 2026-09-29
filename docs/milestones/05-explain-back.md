# Milestone 05: Explain-back and rubric grader

Status: not started
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

Filled in at the end of the session.
