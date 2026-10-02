# Milestone 14: Student app shell, navigation, calendar and design system

Status: done
Session: one shot

## Goal

The student area becomes an app: a persistent navigation (sidebar on desktop, bar on phones) with
Home, Course, Calendar, Progress and Mentor, and a home page that holds only what a kid needs at
a glance. The parent area gets the same shell with its own items. One coherent visual system
across every route: a white base with light, colorful accents (one primary accent plus a soft tint
per feature), never grey-on-grey; a type scale with personality, consistent radii and surfaces,
shared primitives. No behavior changes. Everything the smoke tests and the gate check today still
passes, with the smoke paths that read dashboard sections visiting the new pages, and every route
scores 90 or better on Lighthouse.

## Read first

- The frontend-design skill (invoke it with the Skill tool, name `frontend-design:frontend-design`, before writing anything)
- `docs/memo/08-mvp-steering-oct1.md` §1 (positioning), §7 (what is on screen in the demo)
- `src/app/layout.tsx`, `src/app/globals.css`, and every `page.tsx` under `src/app/`
- The "Notes for the next milestone" of milestones 10 to 13

## Scope

In:

- Design tokens in `src/app/globals.css` as Tailwind 4 theme variables: a white base, one primary
  accent, a soft tint and a deep text color per feature (today, course, calendar, progress, mentor),
  one success and one alert, a type scale, spacing and radius scale, focus ring. Fonts through
  `next/font` only. The prototype palette from 11 is replaced.
- Shared primitives under `src/components/ui/` (button, card, field, badge, progress bar, panel
  header, notice), each a server component unless it needs state; no component library.
- App shell for the student area: a persistent left sidebar on desktop, collapsing to a bar on
  phones, with Home, Course, Calendar, Progress, Mentor; the student's name and level in the
  sidebar; the admin ribbon from 13 at the top of every student page. Navigation is
  server-rendered links, with at most one small client component for the phone-width toggle. The
  session page stays a focus view without the sidebar and keeps its breadcrumb.
- Home (`/student`): a class selector at the top with "Algebra I" selected and "Geometry · coming
  soon" disabled (no second course exists), then today's session card, course progress, level and
  XP, streak, phone status, and a compact "this week" strip of session days marked done, missed,
  scheduled and today. Nothing else on this page.
- Course (`/student/course`): the full course map from 13 with a progress bar per unit.
- Calendar (`/student/calendar`): a month view built from the existing `session_logs` schedule rows
  and the student's session days, with done, missed, scheduled and today states, the next session
  called out, previous and next month as links, no calendar library.
- Progress (`/student/progress`): XP and level, the badge shelf, the rewards panel.
- Mentor (`/student/mentor`): the mentor card and the waiting-room link.
- Parent area: the same shell with Overview, Explanations, Alerts, Phone rules, Mentor, reusing the
  existing pages and sections where they exist. No new parent features.
- Every new route added to `ROUTES` in `scripts/lighthouse.mjs`.

Out (do not build, even if tempting):

- Any data model change; any new query beyond reading schedule rows for the calendar; any change
  to actions, the engine, the coach, the grader, the gate or the seed; any new parent feature; any
  external font, icon or script CDN; any animation or calendar library.

Priority if time runs short: shell and Home first, then Course and Progress, then Mentor, then the
Calendar, which may degrade to the week strip plus a list of the next ten session days. The notes
say what was cut.

## Acceptance criteria

1. Every route in `ROUTES`, the new ones included, scores 90 or better on performance,
   accessibility and best practices.
2. The full smoke suite passes unchanged in behavior, with the paths that read dashboard sections
   visiting the new pages.
3. First-load JS on the session route does not grow by more than 2 KB.
4. `scripts/gate.sh` exits 0.

## Smoke path

Unchanged in behavior from 13; the student dashboard sections are read on the pages they moved to.
Screenshots in `docs/screenshots/` regenerated in demo order.

## Notes for the next milestone

- Tokens: `src/app/globals.css` resets Tailwind's palette (`--color-*: initial`) and defines the whole system: `ink`, `ink-soft`, `ink-faint` for text (every pair clears 4.5:1 on white and on each tint), `line`, `well`, `track`; the primary accent `primary` with `primary-deep` and `primary-tint`; a tint set per feature, `today` (marigold), `course` (sky), `calendar` (teal), `progress` (pink), `mentor` (green), each as fill, `-deep` text and `-tint` surface, listed in `src/components/ui/tints.ts` so Tailwind emits the classes; `success` and `alert` with their fills and tints; `night`, `night-high`, `open`, `open-high` for the phone's screen. A type scale (12 to 54), radii that grow with the surface (sm inputs, md wells, lg cards, xl heroes, 2xl the phone's screen), two animations (`rise`, `phone-toast`), the `tone-night` utility (white text, translucent soft tokens, used only on the phone and the admin ribbon) and `focus-ring`, `link` utilities. Fonts: Bricolage Grotesque (display, figures, equations, clocks, with its `opsz` axis) and Instrument Sans (body) through `next/font/google`; Geist and Geist Mono are gone, and so is `font-mono`: equations use `Equation` (`src/app/student/session/[id]/equation.tsx`), numbers use `tabular-nums`. Dark mode is gone too: the brief asked for dark text on light surfaces, and one theme halves the contrast surface. `THEME_COLOR` is unchanged (#1b1838 is `night`), so the icons still match.
- Primitives in `src/components/ui/`: `Button` and `buttonClass` (primary, secondary, light; md, sm), `Card` and `cardClass` (surface, well as the inset on a tinted card, or a tint; padding md, sm, xs or none, because Tailwind orders `p-5` before `p-6` and a className override loses), `PanelHeader`, `PageHeader`, `Field`, `Legend`, `Choice`, `inputClass`, `Badge` (outline, success or a tint), `ProgressBar` (segmented under nine steps), `Notice`, and the glyphs (`StrokeGlyph`, which the phone's `AppGlyph` and the navigation's `NavGlyph` share, plus `CheckGlyph`, `CrossGlyph`, `FlameGlyph`, `StarGlyph`, `MicGlyph`); `NoStudent` in `src/components/`. All server components; the client blocks import them as plain functions.
- Shell: `AppShell` in `src/components/shell/app-shell.tsx` renders one `<nav>` that is a sticky sidebar from `lg` and a fixed bottom bar below it, pure CSS, no client code and no toggle; the identity block (name and level, or "Parent view") shows only on the sidebar. `StudentShell` (`src/app/student/student-shell.tsx`) and `ParentShell` (`src/app/parent/parent-shell.tsx`) hold the items and are rendered by each page with `active`, because a layout cannot know the current path on the server; they take the student and a render function, and show `NoStudent` themselves when there is none, so no page repeats the empty state. The student shell renders the admin ribbon with `back="/student"`, since `BackPath` in the admin actions (frozen) only allows `/admin`, `/student` and a session path: a ribbon action on a sub-page lands on Home with its notice. `src/app/student/layout.tsx` and `src/app/parent/layout.tsx` are gone; the session keeps its focus view through `src/app/student/session/layout.tsx`.
- Home (`/student`): `ClassSelector` (Algebra I pressed, "Geometry · coming soon" a disabled button), the greeting, `TodayCard` (today tint, the phone line with a lock or open glyph), the three tiles, `WeekStrip`, and `PhoneSection` in a right column from `xl` when the student has a rule (the section is a container query: the caption sits beside the phone when the section is wide enough, else under it). Nothing else. The course map, badges, rewards, mentor card and recent sessions left the page: Course, Progress and Mentor hold them; the student has no session history list any more (the calendar and the parent's history carry it).
- Calendar: `src/calendar/month.ts` is pure and unit-tested (`tests/unit/calendar/month.test.ts`): `monthGrid` (Monday first), `weekOf`, `shiftMonth`, `monthLabel`, `dayStates` and `nextSessionDay`. `dayStates(slots, completedDays, today, from, to)` reads the plan the way the pace engine does: `slots` is `plannedSlots` (the schedule rows carried on to the last day asked for) and a plan day is done when a session finished on it, missed when it passed without one (or today's row says so), else scheduled; a session on a day off the plan shows as done too. The first cut read the schedule rows alone and showed a finished day as still scheduled, because a session is its own row with no `scheduled_for`. No new query in the end: Home and the calendar call `scheduleRecord` (the engine's own read) and the home page derives the streak tile from the same record instead of calling `studentStanding` on top. `getStudent` now also selects `sessionTime` and is wrapped in React `cache`, so a page, its shell and `adminControls` read the row once per request. `month` comes from zod against `MONTH_PATTERN` (20xx), clamped to two years either side of the current month; the previous and next month are plain links.
- Parent: Overview keeps the standing, the phone (in a calendar-tinted card), rewards, the course map (now with a bar per unit) and session history; Explanations, Alerts and Mentor are pages of their own, each calling `gatedFamily` with its own path (the proxy's `/parent/:path*` matcher covers them, and `NextPath` accepts them). Phone rules is the old settings page in the shell.
- Smoke: the paths that read the badge shelf, the course map, the rewards panel, the mentor card and the explanation now visit `/student/progress`, `/student/course`, `/student/mentor`, `/parent/explanations` and `/parent/mentor`; the "Recent sessions" checks became `This week` checks (`today, scheduled`, `today, done`, `today, missed` in the strip's screen-reader text); the "Level 2" check targets the tile heading, because the sidebar says "Level 2" too. The demo spec parks the parent tab back on `/parent` before the session so the phone unlock is still watched live.
- Review passes: `/security-review` found nothing (gate coverage, query scoping and the `month` parser checked). `/code-review high` found the calendar's done-day bug above, the unbounded month range, the duplicated page header and empty state, the earnings read every student page made for the sidebar (Course, Calendar and Mentor now call `masteredConcepts`), and the year bound. `/simplify` added the card padding option, the shared glyph renderer and badge item, the `DayCell`, the `tone-night` utility covering `primary` so one `focus-ring` and one `link` serve light and night surfaces, and dropped unused props and tones. Skipped: moving the engine's private `weekOf` (the engine is frozen), typing `historyResult`'s label, a render-tree shell layout with a client `useSelectedLayoutSegment` (the brief allowed one client component for a toggle, not for the navigation), and an XP-only query for Home (no new queries).
- First-load JS (Lighthouse, gzipped, local gate run): the session route 149.2 KB (was 148.3; the shared primitives it imports are the growth, inside the 2 KB allowance), `/student` and `/parent` 146.9 KB (were 147.2), `/onboarding` 148.6 KB (was 147.5: the form now imports the primitives; a first run read 152.0 KB because the root layout's wordmark used `next/link`, the one route that had no other link paid for the link runtime, so the wordmark is a plain anchor with the lint rule disabled on that line and the reason beside it), every other route including the seven new ones 141.5 KB. The 150 KB budget was not raised. Every route 100/100/100.
- Smoke runs 10 tests in about a minute; the gate's Lighthouse pass audits 16 routes (the 15 in `ROUTES` plus a session) and takes about ten minutes on this host.
- Cut: nothing from the control tower's list; the calendar shipped as the full month view. Left: the sidebar level is computed from the mastered set each page already reads, so a page without `studentEarnings` would need it added; the parent identity reads "Parent view" because no query returns the parent's name and new queries were out of scope; the session history table is still cramped at phone width; the home page's five-block rail reads `BLOCKS` and will need a new course's blocks when one exists; `docs/demo-runbook.md` rows 2, 3 and 5 now name the pages each section moved to.
