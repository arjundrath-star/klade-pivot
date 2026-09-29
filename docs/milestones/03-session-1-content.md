# Milestone 03: Session 1 content with interest variants

Status: not started
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

Filled in at the end of the session.
