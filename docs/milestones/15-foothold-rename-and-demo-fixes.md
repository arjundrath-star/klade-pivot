# Milestone 15: Foothold AI rename, demo-day fixes, and the anti-template pass

Status: not started
Session: one shot

## Goal

The product is called Foothold AI everywhere a user can see it, the four demo-day defects from 13 and 14 are gone, and the surfaces a judge will see pass a written checklist of what makes a site read as generated rather than designed. No feature work.

## Read first

- `docs/memo/03-decision-log.md` D46 (the name and the hook) and D45
- `docs/memo/eval/vibe-checklist.md` if it exists (the founder's checklist, derived from an article; every item is a pass/fail check for this milestone)
- The notes sections of `docs/milestones/13-course-map-and-dashboard.md` and `14-visual-polish.md`
- `src/config/app.ts`, `src/app/manifest.ts`, `src/app/layout.tsx`, `README.md`, `docs/demo-runbook.md`

## Scope

In:

- Rename: `APP_NAME` becomes "Foothold AI" and `APP_DESCRIPTION` follows D46's thesis; the wordmark, the icon letter (F, regenerated from the inline SVG), page titles, the manifest, the gate page, the email preview, the README title and status, and the runbook all follow from the constants or are updated by hand; "Klade" survives only where it names the company (CLAUDE.md, the memo, the repo name). Add `foothold.rathworkspace.cloud` as a second hostname on the existing tunnel route to the same service and set `NEXT_PUBLIC_APP_URL` to it; `klade.rathworkspace.cloud` keeps working.
- Phone copy on non-session days: the one-line phone status on the today card and the phone panel's lock screen say when the next session day is and that the phone is open until then, instead of "No session today. Everything is open."
- Demo-day reward: the seeded "4-week streak" reward reaches its target on completion of the demo session on any weekday, by seeding its progress from the live rule so that one more session completes it; the unit test for the persona asserts it for every weekday.
- Parent identity: the parent shell shows the parent's first name from the family row (Dana in the seed) instead of "Parent view".
- History table at phone width: the recent-sessions and parent history tables collapse to stacked rows under 480 px.
- Anti-template pass: apply every item in `docs/memo/eval/vibe-checklist.md` to the home page, student home, session page, parent overview and onboarding; record each item as done or not applicable in the milestone notes.
- Regenerate the three screenshots in `docs/screenshots/` and the deck-ready captures under `docs/screenshots/deck/` (every student and parent page at 1440 px, signed in).

Out (do not build, even if tempting):

- Any new feature, any change to the engine, the coach, the grader, the exit check, the gate's logic, or the course data.

## Acceptance criteria

1. No user-visible string says "Klade" as the product name; `grep -rn "Klade" src/ public/` returns only the company references the notes list.
2. The seeded persona's reward unlocks on completion on every weekday in the unit test.
3. The phone status names the next session day when today is not one.
4. Every checklist item is marked done or not applicable in the notes with a one-line reason.
5. The full smoke suite passes; every route scores 90 or better; the session route's first-load JS does not grow.
6. `scripts/gate.sh` exits 0.

## Smoke path

Unchanged from 14, plus: the home page title and wordmark read Foothold AI; `/student` on a Friday shows the next session day in the phone line.

## Notes for the next milestone

Filled in at the end of the session.
