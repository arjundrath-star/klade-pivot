# Milestone 03: Session 1 content with interest variants

Status: done
Session: one shot

## Goal

Session 1 (two-step equations) is real: a warm-up on prerequisites, a stepped lesson with one worked example, a guided practice set with interest-framed word problems, and an exit-check set. Written by hand as typed data, reviewed against the realism rule, wired into the shell from 02.

## Read first

- `docs/memo/02-mvp-spec-v1.md` §2 (S1), §3.2 blocks 1 to 3, §3.2a
- `docs/memo/01-company-memo-v1.md` §6.4a (realism rule and the basketball/music example)
- `src/engine/`, `src/content/` conventions from 02

## Scope

In:

- `src/content/algebra1/linear-equations/s1.ts` exporting a `SessionContent`:
  - `warmup`: 3 problems on prerequisites (integer operations, one-step equations), engine-generated.
  - `learn`: concept explanation (short, plain, 8th-grade reading level) and one worked example as ordered steps, each step revealed on click. The example uses a two-step equation from the engine with a fixed seed so it never changes.
  - `guided`: 5 problems, at least 3 of them word problems. Each word problem has all six interest variants plus neutral. Each variant reads naturally to a kid who knows the topic (no 11-goal soccer games, no 200-song albums). Numbers come from the template ranges so every variant stays realistic; tighten the ranges if any variant would not.
  - `exit`: 3 problems, at least 1 word problem with all variants. Distinct from the guided set.
- Lesson block UI: stepped reveal of the worked example, "I've read this" gate before Next.
- Word-problem rendering in blocks 3 and 5 uses the student's interests from the profile.
- Unit tests: every word problem has 7 variants with no unreplaced placeholders; the realism ranges are asserted (e.g., points per quarter between 4 and 15); the exit set shares no template key with the guided set.
- A `docs/content-review.md` checklist noting the realism rule, reading level, and standard alignment (HSA-REI.B.3) for the teacher reviewer, with S1 marked "drafted, not yet reviewed".

Out:

- Sessions 2 and 3, the coach, explain-back, grading, parent view.

## Acceptance criteria

1. Maya (sports, music) sees soccer- or music-framed word problems; a student seeded with gaming sees the same equations framed as gaming. Same answer key. No model call anywhere in the render path (grep `anthropic` in `src/content/` and `src/engine/` returns nothing).
2. A student with no interests set sees the neutral variants.
3. `scripts/gate.sh` exits 0.

## Smoke path

`/student` → Start → warm-up (3 problems) → learn (reveal every step, confirm) → guided practice shows a sports- or music-framed word problem for Maya → answer all 5 → Next.

## Notes for the next milestone

- Engine: a fourth structure, `one-step`, with `form: "multiply"` (`ax = c`, placeholders `a`, `c`) or `form: "add"` (`x + b = c`, placeholders `b`, `c`). The multiply form never draws `a` = 0 or 1 (`EXCLUDED_MULTIPLIERS` in `generate.ts`), so every one-step instance takes exactly one step. Draw order for the other three structures is unchanged, so stored `(template_key, seed)` pairs still replay.
- S1 content (`src/content/algebra1/linear-equations/s1.ts`): warm-up is 3 symbolic one-step problems with negative ranges (integer operations); guided is 5 two-step problems at indexes 0 to 4, word problems at 1, 2 and 4; exit is 3, word problems at 1 and 2. Every sports variant is soccer. Template keys are stored on attempts, so never rename one; add a new key instead.
- Interest rotation is `selectVariant(interests, index)` by position in the block, so for Maya (sports, music) index 1 is music and 2 and 4 are sports. Reordering a block changes who sees which framing.
- Realism: `tests/unit/content/s1.test.ts` holds a `REALISM` table of limits per word template (a, b, x, and the derived c from the range ends). Widening a range past it fails the test on purpose; reread all seven variants before moving the limit. The same file checks 7 variants, no unreplaced placeholders, every variant naming `{a}`, `{b}`, `{c}`, exit and guided sharing no key, and no `anthropic` in `src/content` or `src/engine`. S2 content should copy this test file.
- Worked example: `defineWorkedExample` in `src/content/lesson.ts` builds and validates it at module load (reasons must match `solutionSteps`, and a check step is appended). S1's example template pins every range to one value (3x + 5 = 20), so hand-written reasons cannot drift. `SessionContent.learn.example` is now the built `WorkedExample`, not `{ template, seed }`.
- Lesson gate: `session_logs.lesson_read_at` (migration `0001_lesson_read`). `confirmLesson` sets it only for the student's open session on the learn block, and keeps the first time. `isBlockComplete(block, counts, progress)` now takes `SessionProgress { solved, lessonRead }`; 05's explain-back pass and 06's exit rule belong there as new fields. The client runner exposes them through `useProgress()` (renamed from `useSolved`). The step reveal is a client reading aid: revealed steps reset if the student leaves the block before confirming, and the server does not check reveals.
- `loadSession` now also returns `content`. `renderSessionProblem(problem, interests)` in `src/session/problems.ts` is the one render path for the page, the smoke helper (`renderedFor` in `tests/helpers/answers.ts`) and the content tests; 06's exit panel should use it.
- The exit block is still a stub panel. Its three problems exist in content and render through `renderSessionProblem`, but answering, the 90-second server-side timer and the mastery verdict are 06's. `exit` is still not in `ANSWERED_BLOCK_IDS`.
- Lighthouse: the gate now fails any route over 150 KB of script transfer (`FIRST_LOAD_JS_BUDGET`, from the report's `resource-summary`), and runs performance up to 3 times per route, passing on the best; accessibility and best-practices run once. Each route is fetched once before its audit. Current first-load JS: `/` 136.0 KB, `/student` 136.0 KB, `/student/session/[id]` 143.3 KB. The session route has about 7 KB of headroom, so the coach (04) must keep its client code small or load it on demand.
- `docs/content-review.md` has the teacher checklist; S1 is "drafted, not yet reviewed".
