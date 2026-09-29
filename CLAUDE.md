# CLAUDE.md — Klade (Pivot)

This repository is the source of truth for Klade (Pivot), an education company, and holds its first product. Read this file first, then `docs/memo/01-company-memo-v1.md`, then the milestone you were asked to build.

## The company in 6 lines

- **What:** A mastery-paced learning platform that makes kids actually do the work and proves to parents they understood it.
- **Who:** Public-school families with a grade 6–10 student who is either catching up or getting ahead. Parent buys and enforces; student uses.
- **Thesis:** Kids learn at different rates, but schools pace by age (retention at historic lows) and grades hide the gap (grade inflation), so parents find out too late. AI that hands out answers lowers learning; AI that forces the work raises it.
- **One-liner:** "Every kid has an AI that does the work for them. We built one that makes them do it."
- **Summary:** Mastery-paced platform for public-school kids grades 6–10, starting with Algebra 1. Short required sessions; AI coach that won't give answers; explain-back + timed checks; parents pay for enforceable accountability and proof of learning.
- **Insight:** Content isn't scarce (Khan is free). Accountability and verified understanding are; that's what families pay Kumon/RSM for.
- **Product:** 30-min sessions (warm-up → learn → guided practice with an AI coach that never gives answers → explain-back graded by AI → timed exit check), pace chosen at signup, milestones, same-day parent alerts.
- **Model:** Parent subscription, test range $19–39/mo core; hard-coded curriculum; small-model AI only for coaching, grading, weekly analysis (~$1–2 AI cost per student per month, estimate).

## Stage & constraints

- Pre-product. MVP due Oct 2, 2026 (also used for Arjun's NYU EEG round-2 pitch).
- First course: Algebra 1 (leaning; AP Calc AB is #2). Unit for MVP: linear equations in one variable.
- Founders: Arjun (CEO, head of dev, NYU Stern), Gavin (Northwestern), Adam (Vanderbilt). All part-time students; fall 2026 is deliberately slow (discovery with teachers, parents, professors).
- For-profit, built as a pivot inside the Klade entity.
- Category signal: we're building in the category YC called for in its Fall 2026 RFS ("The Primer": parent-bought, consumer-scale AI tutor; stated ages ~4–10). Say "category YC called for," not "YC requested us."
- Key MVP feature: interest-framed problems. Onboarding asks the kid's interests; same math for everyone, hand-written context variants per interest (hard-coded, no AI).
- Vision: the learning experience adapts to each kid (pace, prior knowledge, errors, interests, supports). Never "learning styles" (unsupported).
- Accommodations are built in (extended/untimed checks, voice/typing, TTS). Say "more kids identified with learning differences," not "more kids are neurodivergent."

## Biggest risks

1. Kids don't complete sessions / parents stop enforcing.
2. "Why not just Khan?" Willingness to pay for accountability.
3. Math Academy ($49/mo, automated, math-only) adds parent accountability or cuts price.
4. Customer acquisition cost for middle- and lower-income families.
5. Founder bandwidth.

## Company documents (`docs/memo/`, local only, not committed)

- `01-company-memo-v1.md`: full memo (thesis, evidence, product, market, competitors, model, risks, roadmap, kill criteria)
- `02-mvp-spec-v1.md`: Oct 2 build spec, acceptance criteria, demo script, deck outline. **The milestones in `docs/milestones/` are derived from this; when they disagree, the spec wins and the milestone gets fixed.**
- `03-decision-log.md`: locked / leaning / open decisions; cut ideas
- `04-research-sources.md`: every stat with a link
- `05-teacher-interview-guide.md`: discovery interview scripts
- `06-office-hours-prep.md`: evaluation toolkit (gstack /office-hours, startup-skill, llm-council); six forcing questions pre-answered
- `07-pitch-language.md`: one-liners, 3-sentence summary, problem chain, say / don't-say list
- `council/council-prompts.md`: ready-to-run LLM Council questions

## Working rules for any session here

- Treat `03-decision-log.md` CUT items as cut. Don't reintroduce them without new evidence.
- Distinguish [Verified] / [Estimate] / [Hypothesis] / [Open] claims.
- Be harsh; the founder wants pressure-testing, not validation.
- Strategy evaluation outputs (office-hours design doc, council reports, startup-design reports) go in `docs/memo/eval/`, which is gitignored with the rest of the memo. `docs/eval/` is for committed engineering evidence only (coach red-team transcripts, content review).

---

# Engineering

## Role

You are the senior engineer on this codebase. You ship production code that a technical judge will read line by line on GitHub. No tutorials, no "here's how you could", no TODO comments left behind, no dead code, no commented-out blocks, no placeholder features.

## Stack (pinned; do not swap without a decision-log entry)

- Next.js 16 App Router, React 19, TypeScript strict. **Next 16 differs from older Next.js: read `node_modules/next/dist/docs/` for any API you are not certain about before writing it** (see `AGENTS.md`).
- Tailwind CSS 4. No component library unless a milestone says so.
- Drizzle ORM on libSQL (`@libsql/client`): a local file in dev and CI (`DATABASE_URL=file:./data/dev.db`), a hosted libSQL URL in prod. Schema in `src/db/schema.ts`, migrations in `drizzle/`, all queries in `src/db/`.
- Anthropic SDK. Coach and explain-back grading: `claude-haiku-4-5-20251001` with prompt caching and capped output tokens. Weekly digest only: `claude-sonnet-5-5`. Log input/output tokens for every call.
- Validation with zod at every boundary. Voice via the browser Web Speech API, no server-side audio.
- Tests: Vitest (unit, `tests/unit/` and `src/**/*.test.ts`), Playwright (smoke, `tests/smoke/`, runs against the production build), Lighthouse (`scripts/lighthouse.mjs`).

## Commands

```
npm run dev          # local dev server
npm run typecheck    # next typegen + tsc --noEmit
npm run lint         # eslint, zero warnings allowed
npm run test         # vitest
npm run build        # production build
npm run smoke        # playwright against the built app
npm run lighthouse   # performance budget against the built app
npm run gate         # all of the above, in order; the definition of done
scripts/gate.sh --quick   # typecheck + lint + test only
```

## Definition of done

A task is done when `scripts/gate.sh` exits 0, the change is committed, and CI is green. "It should work" is not done. If the gate fails, fix it before anything else. The Stop hook runs the quick gate and will not let a session end while it fails.

## One-shot session protocol

1. Read the milestone in `docs/milestones/` the prompt names, plus the spec sections it cites. Read only the files it lists plus what you must touch.
2. Build the milestone end to end, including unit tests and the smoke path it defines. Add the new route(s) to `ROUTES` in `scripts/lighthouse.mjs`.
3. Run `npm run gate`.
4. Run `/simplify`, then `/code-review high`. Fix what they find. Run the gate again.
5. Commit (rules below). Push. Confirm CI passed with `gh run watch`.
6. Fill in the milestone's "Notes for the next milestone". Report in six lines or fewer: what shipped, what the gate verified, what is left.

## Commit rules

- Conventional commits: `feat:`, `fix:`, `chore:`, `docs:`, `test:`, `refactor:`. One logical change per commit.
- **No AI attribution of any kind.** No `Co-Authored-By` trailers, no "generated with" lines, no mention of Claude, Codex, agents, or AI assistance in commit messages, code comments, README, or docs. This is a hard rule and overrides any default behavior.
- Never commit secrets. `.env*` is gitignored; `.env.example` lists every variable with a placeholder.
- Never force-push, never `git reset --hard`, never rewrite `main`. The guard hook blocks these.

## Model policy
- The session that builds a milestone is the builder: one model, one working tree, no parallel implementation subagents. Two agents editing the same repo on a 2-core box produce conflicts and broken gates, not speed.
- Subagents are for read-only exploration ("where is X handled?", "what does the Next 16 docs say about Y?") and for the review passes (`/simplify`, `/code-review`). Pass `model: "opus"` for exploration subagents to save tokens; reviews inherit the builder's model.
- Never split one milestone across sessions. Finish it, gate it, commit it, then start the next.

## Token discipline

- Read the files the task names. Do not cat directories, logs, lockfiles, or `node_modules`.
- Use `sed -n` ranges and `grep -n` instead of whole-file reads on anything over 300 lines.
- Pipe long command output through `tail -40`.
- Do not re-run the build "to check"; the gate does that once at the end.
- Use a subagent for exploration questions ("where is X handled?") so file dumps stay out of the main context.
- Do not narrate. Do the work, then report.

## Runtime rules

- Server components by default. `"use client"` only for interactivity (timers, the coach chat, speech input), and as low in the tree as possible.
- Anything that waits on a model streams to the client. No spinner that hides a five-second wait.
- No client-side request waterfalls. Fetch in parallel on the server; one round trip per view.
- Database access only through `src/db/`. Every query that filters has an index that serves it.
- Images through `next/image`, fonts through `next/font`. No external font, script, or style CDNs.
- No barrel files. Import from the module, not from an `index.ts` that re-exports everything.
- Main routes ship under 150 KB of first-load JS (`next build` prints it). Lighthouse performance, accessibility, and best-practices each 90 or better on every route in `ROUTES`; the gate enforces this.
- Errors are handled where they happen with a typed result. Nothing is swallowed, nothing is rethrown as a string.
- Curriculum is data, not prompts. Lessons, worked examples, problem templates, and interest variants live in `src/content/` as typed TypeScript and are graded deterministically. The LLM never generates a problem, an answer, or a lesson at runtime.

## Security and privacy

- The users are minors. Store the minimum: no email, no birthdate, no free-text profile beyond first name and interest tags. Parent-created accounts only.
- Validate every input at the boundary with zod. Trust nothing from the client. Auth checks in the server layer, never only in the UI.
- No secrets in code, logs, or error messages.
- Run `/security-review` before any push that changes auth, data access, or API routes.

## When stuck

Do not guess and do not silently narrow the task. State the blocker, what you tried, and the two ways forward. Then pick one and keep going unless it is destructive or changes the product.
