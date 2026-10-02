# Milestone 14: Visual polish and design system

Status: not started
Session: one shot

## Goal

The product looks like a product. One coherent visual system across every route (home, onboarding, student, session, parent, parent settings, admin, mentor pages): type scale, palette, spacing, radii, surfaces, buttons, inputs, cards, empty states, the phone panel and the completion screen. No behavior changes. Everything the smoke tests and the gate check today still passes, and every route still scores 90 or better on Lighthouse.

## Read first

- The frontend-design skill (invoke it with the Skill tool, name `frontend-design:frontend-design`, before writing anything)
- `docs/memo/08-mvp-steering-oct1.md` §1 (positioning), §7 (what is on screen in the demo)
- `docs/memo/eval/design-brief.md` if it exists (a Claude Design export or notes from Arjun; optional input, port its tokens, never its runtime or CDN assets)
- `src/app/layout.tsx`, `src/app/globals.css`, and every `page.tsx` under `src/app/`

## Scope

In:

- Design tokens in `src/app/globals.css` as Tailwind 4 theme variables: palette with one accent and one success and one warning, neutral surfaces with real contrast, a type scale, spacing and radius scale, focus ring. Fonts through `next/font` only.
- A small set of shared primitives under `src/components/ui/` (button, card, field, badge, progress bar, panel header), each a server component unless it needs state, used by every route; no component library.
- The home page, onboarding steps, the student dashboard from 13 (today card, progress, course map, XP, streak, badges, rewards, mentor card, phone panel, admin ribbon), session shell and blocks (problem card, coach panel, explain panel, exit countdown, completion screen), parent view and settings, admin, mentor pages, all restyled on the primitives. Dark text on light surfaces; accessible contrast everywhere; reduced motion respected.
- The phone panel and the completion screen get the most attention: they are the demo's two centerpieces.
- Unit tests unchanged; smoke tests unchanged except for selectors that had to move; Lighthouse accessibility stays at 90 or better on every route.

Out (do not build, even if tempting):

- Any new feature, any change to actions, queries, the engine, the coach or the grader; any external font, icon or script CDN; any animation library.

## Acceptance criteria

1. Every route in `ROUTES` scores 90 or better on performance, accessibility and best practices after the restyle.
2. The full smoke suite passes unchanged in behavior.
3. First-load JS on the session route does not grow by more than 2 KB.
4. `scripts/gate.sh` exits 0.

## Smoke path

Unchanged from 13. Screenshots in `docs/screenshots/` regenerated in demo order.

## Notes for the next milestone

Filled in at the end of the session.
