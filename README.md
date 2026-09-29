# Klade

**Every kid has an AI that does the work for them. We built one that makes them do it.**

Klade is a mastery-paced learning platform for public-school students in grades 6 to 10, starting with Algebra 1. Students complete short, required sessions in which an AI coach makes them do the work instead of handing over answers, then explain their reasoning out loud, graded against a rubric, and pass a timed check. Parents get accountability they can enforce and a record of what their kid can explain.

## What the MVP shows

A student can sit down for 30 minutes, learn one Algebra 1 concept without the AI doing it for them, explain it in their own words, and their parent can see exactly that, and gets told if the student skips.

The first slice is Linear Equations in One Variable (Common Core HSA-REI.B.3): two-step equations, variables on both sides, and distribution with like terms.

## How a session works

| Minutes  | Block           | What happens                                                                      |
| -------- | --------------- | --------------------------------------------------------------------------------- |
| 0 to 4   | Warm-up         | Three problems from prior material                                                |
| 4 to 10  | Learn           | One concept, one worked example revealed a step at a time                         |
| 10 to 20 | Guided practice | Problems with the coach: hints and questions, never the answer                    |
| 20 to 25 | Explain-back    | The student explains one solution by voice or text; a rubric grades the reasoning |
| 25 to 30 | Exit check      | Three timed problems, no hints; failing repeats the concept next session          |

Every student gets the same math. Word problems are written once per interest (sports, music, gaming, food, creators, animals) and selected by tag at runtime, so a soccer player and a musician solve the same equation in their own world.

## Architecture

- **Next.js 16** (App Router, React 19, TypeScript strict) with **Tailwind CSS 4**.
- **Drizzle ORM on libSQL**: a local file in development and CI, a hosted database in production.
- **Curriculum is data.** Lessons, worked examples, parametrized problem templates, and interest variants are typed TypeScript in `src/content/`. Problems are generated from integer ranges and graded deterministically. No model generates a problem, an answer, or a lesson at runtime.
- **AI only where judgment is needed.** The coach and the explain-back grader run on a small model (Claude Haiku 4.5) with cached prompts and capped output; the weekly parent digest uses a larger model once a week. Token usage is logged per call so the real cost per session is visible in the admin view.
- **Voice** uses the browser's Web Speech API. No audio leaves the device.

## Quality gate

Nothing merges unless `npm run gate` passes locally and in CI:

1. `typecheck`: route type generation and `tsc --noEmit`
2. `lint`: ESLint with zero warnings allowed
3. `test`: Vitest unit tests (problem generation, grading, pace math, rubric parsing)
4. `build`: production build
5. `smoke`: Playwright walks the core flow against the built app and fails on any console error
6. `lighthouse`: performance, accessibility, and best practices each 90 or better on every main route

The same script runs in GitHub Actions on every push.

## Getting started

```bash
npm ci
cp .env.example .env.local   # add ANTHROPIC_API_KEY
npm run dev
```

```bash
npm run gate                 # the full check
scripts/gate.sh --quick      # typecheck, lint, and unit tests only
```

## Layout

```
src/app/         routes (student session, parent view, onboarding, admin)
src/content/     curriculum: lessons, problem templates, interest variants
src/engine/      problem generation and deterministic grading
src/coach/       the guardrailed coach and the explain-back grader
src/db/          schema, client, queries
tests/unit/      vitest
tests/smoke/     playwright
scripts/         gate, guard, lighthouse
docs/milestones/ the build plan, one spec per milestone
```

## Status

Pre-product. The MVP is being built milestone by milestone; see `docs/milestones/`.
