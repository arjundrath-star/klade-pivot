# Milestone 01: Problem engine

Status: done
Session: one shot

## Goal

Everything else depends on this. A typed problem-template system that generates linear-equation problems from integer ranges, grades answers deterministically, and renders word problems in the student's interest context without any model call. Pure TypeScript, no UI, fully unit-tested.

## Read first

- `docs/memo/02-mvp-spec-v1.md` §2, §3.2a, §6, §7 (ProblemTemplate)
- `docs/memo/01-company-memo-v1.md` §6.4a (interest-framed problems, realism rule)

## Scope

In:

- `src/engine/types.ts`: `Interest` union (`sports | music | gaming | food | creators | animals`), `ProblemTemplate`, `ProblemInstance`, `AnswerCheck` result type.
- `src/engine/random.ts`: a seeded PRNG (mulberry32 or equivalent) so a session can be replayed from its seed.
- `src/engine/generate.ts`: generators for the three S1/S2 structures. Two-step `ax + b = c`, variables on both sides `ax + b = cx + d`, and distribution `a(x + b) + cx = d`. Every generated instance has an integer solution and non-degenerate coefficients (`a ≠ 0`, `a ≠ c` where relevant). Coefficient ranges live on the template, not in the generator.
- `src/engine/check.ts`: deterministic answer checking. Accepts `5`, `x = 5`, `x=5`, `-3`, `1/2`, `0.5`, `x = -3/2`; rejects anything else. Rational arithmetic, no floating tolerance games. Returns `{ correct, normalized, expected }`.
- `src/engine/render.ts`: renders a template with an instance and the student's interests. Word-problem templates carry `variants: Record<Interest, string> & { neutral: string }`; symbolic templates carry `variants: { neutral }` only. Selection: rotate between the student's one or two interests by problem index; fall back to `neutral`. Placeholders are `{a}`, `{b}`, `{c}`, `{d}` and are substituted verbatim.
- `src/engine/solve.ts`: returns the ordered solution steps for an instance (used later by the coach's "similar worked example" and by the explain-back rubric context). Steps are data (`{ description, equationAfter }`), not prose.
- Unit tests in `tests/unit/engine/`: 200 generated instances per structure all have integer solutions and pass their own checker; checker accepts every equivalent form above and rejects wrong values and malformed input; the same instance rendered for two different interests yields different text and the same expected answer; rendering never leaves an unreplaced placeholder; the seeded PRNG is reproducible.

Out:

- Any UI, any database, any model call, any content beyond one example template per structure used by the tests.

## Acceptance criteria

1. `npm run test` runs the engine suite and passes.
2. Generating 1,000 instances across the three structures takes under 50 ms in the test run.
3. The checker has no float comparison anywhere; grep for `toFixed`, `Math.abs`, `epsilon` returns nothing in `src/engine/`.
4. `scripts/gate.sh` exits 0.

## Smoke path

None (no UI in this milestone). The home page smoke test still runs.

## Notes for the next milestone

- Public API, one module each, no barrel: `defineTemplate` (`template.ts`), `generateInstance(template, seed)` (`generate.ts`), `renderProblem(template, instance, interests, index)` (`render.ts`), `checkAnswer(input, rational(instance.solution))` (`check.ts`, `rational.ts`), `solutionSteps(instance)` and `formatEquation(instance)` (`solve.ts`, `format.ts`).
- Every template must go through `defineTemplate`. It validates ranges, draws and placeholders at module load, and returns a branded `ValidTemplate`; `generateInstance` and `renderProblem` only accept that type.
- Ranges are for `a`, `b`, `x` (plus `c` for both-sides and distribution). The last constant is derived from `x` (`c` for two-step, `d` otherwise), so realism limits on the answer go on `ranges.x`, and the derived total is bounded by the others. `a`, `b` are never zero; `c` is never zero and never cancels `a`.
- Placeholders substitute the value verbatim. `defineTemplate` rejects word templates with non-positive ranges (and both-sides word templates unless `a.min > c.max`, so `d` stays positive), stray braces, and bounds outside ±1000. The student-facing equation for symbolic templates comes back in `RenderedProblem.equation`; word problems return no equation on purpose.
- Persist `seed` and `templateKey` on each attempt: the pair regenerates the instance exactly. A session can draw its per-problem seeds from `createRng(sessionSeed).int(0, 2 ** 32 - 1)`.
- Error convention: bad student input is a typed result (`checkAnswer` never throws). Programmer errors throw at once: an invalid template at module load, a template/instance key mismatch in `renderProblem`, a negative problem index, `rational()` with a zero denominator. `Rational` is branded, so an answer stored as `{ num, den }` must go back through `rational()` or `tryRational()` before `checkAnswer`.
- `checkAnswer` returns `normalized: null` for malformed input, so the UI can say "enter a number" instead of "wrong". It accepts the U+2212 minus sign as well as `-`.
- Not built here, needed by 03: the warm-up's integer-operation and one-step problems are not one of the three structures. Either add a `one-step` structure (`ax = c`, `x + b = c`) to the engine or hard-code the warm-up items with `rational()` answers.
- Example templates live only in `tests/unit/engine/fixtures.ts`; real content goes in `src/content/`.
