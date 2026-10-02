# Milestone 13: Algebra I course map, demo persona with history, student dashboard

Status: not started
Session: one shot

## Goal

The product reads as a course, not a single exercise. The whole of Algebra I is visible as a course map built from the state standards, the student's position in it is obvious, the session page says which unit and standard it belongs to, and the student home is a full dashboard a founder can scroll through in a pitch: today's session, progress through the course, level and XP, streak, badges, rewards, mentor, phone, recent sessions, with an admin ribbon when the gate cookie is present. The demo persona has weeks of history behind her and two-step equations in front of her.

## Read first

- `docs/curriculum/algebra1-outline.md` (the cited course outline; the only source for units, concepts and standard codes)
- `docs/memo/08-mvp-steering-oct1.md` §1, §7
- The frontend-design skill (invoke it with the Skill tool, name `frontend-design:frontend-design`, before writing any dashboard UI)
- `src/content/algebra1/units.ts`, `src/content/algebra1/concepts.ts`, `src/content/sessions.ts`, `src/engine/pace.ts`, `src/engine/progress.ts`, `src/db/queries/sessions.ts` (planner), `scripts/seed.ts`

## Scope

In:

- `src/content/algebra1/course.ts`: the full course from the outline as typed data: units in order, each with concepts (key, title, standard codes, `playable`), and the source citation in a comment. Two-step equations keeps `S1_KEY` and is the only `playable: true` concept; every other concept is visible but not playable yet. `ALGEBRA1_UNITS` (pace), `ALGEBRA1_CONTENT` (badges, levels), the planner and the seed all read from this one file; no second list of units anywhere. `ALGEBRA1_SESSION_ESTIMATE` stays an estimate and is explained against the concept count.
- Course map UI (server-rendered): units as sections, concepts as nodes in three states, mastered, current, upcoming, with the standard code visible on each node; the current node links to today's session; upcoming nodes are clearly not clickable. Used on `/student` and, condensed, on `/parent`.
- Student dashboard on `/student`: a full-width layout with these widgets in this priority order: today's session (unit, concept, standard, 30 minutes, Start, and the phone's lock state in one line), course progress (concepts mastered of total, percent, units done), level and XP bar, streak with freeze, the course map, badge shelf, rewards panel, mentor card, phone panel, recent sessions (date, concept, outcome, minutes). Nothing is hidden behind a click that a judge would want to see. Empty states are written for a brand-new student.
- Admin ribbon: when the request carries a valid gate cookie, `/student` and the session page show a thin bar with links to Simulate missed session, the demo clock, Switch interest, Reset demo and `/parent`, so the demo can be driven from the student screen. Nothing else changes for an ungated visitor.
- Session page: a breadcrumb above the blocks, "Algebra I › Unit N: <unit> › <concept> · <standard code>", and the concept's position ("concept 7 of 42").
- Demo persona: the seed gives Maya history consistent with the course order. Every concept before two-step equations is mastered, with a `done` session log (outcome mastered, dated on her schedule days over the past weeks, minutes filled) and a mastery row per concept; XP events, badges, level and streak are seeded to match what those sessions would have earned; the 4-week-streak reward stays at 3 of 4; two-step equations is the current concept and is not seeded as done (decision D45). "Reset demo" restores exactly this state. State plainly in the notes how far through the course she is by the standards' order; do not reorder the course to make the number bigger.
- Unit tests: course integrity (unique keys, every unit has concepts, every concept has a code, exactly one playable concept and it is `S1_KEY`), planner picks the first unmastered concept, seeded persona is internally consistent (mastery count equals mastered-concept XP and badges), progress percent.

Out (do not build, even if tempting):

- Lessons or problems for any other concept; the design system (14); onboarding changes; any change to the coach, the grader, the exit check or the gate.

## Acceptance criteria

1. `/student` for the demo persona shows the course map with her mastered concepts, two-step equations as current, and progress figures that match the seed; the session page shows the breadcrumb with the standard code.
2. With the gate cookie present, `/student` shows the admin ribbon and its actions work; without it, nothing admin-related renders.
3. Every existing smoke spec passes against the new seed; `Reset demo` returns the persona in under 5 s.
4. Every route in `ROUTES` scores 90 or better; the session route stays within the first-load JS budget.
5. `scripts/gate.sh` exits 0.

## Smoke path

Sign in at the gate → `/student` shows the ribbon, today's session card, progress, the map with mastered and current nodes → Start → the session breadcrumb names the unit and standard → complete the session (existing helpers) → `/student` shows the concept mastered and progress advanced → Reset demo → the persona is back.

## Notes for the next milestone

Filled in at the end of the session.
