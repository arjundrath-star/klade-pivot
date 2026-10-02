# Milestone 17: Session workspace and the two-step equations textbook chapter

Status: not started
Session: one shot

## Goal

Doing a session feels like working at a desk, not filling a form. The session takes the whole screen as a workspace: the unit, concept and standard at the top, block progress and the timer in one strip, one problem at a time with a counter, a notes panel the student types in (and a tablet-writing mode that is visibly a prototype), and the lesson's key learnings one click away during guided practice. The Learn block becomes a textbook chapter for solving two-step linear equations: real explanatory text at an 8th-grade reading level, several worked examples, inline diagrams, verified video links, common mistakes, and a key-learnings summary. One concept only; the structure is reusable for the other 48.

## Read first

- `docs/memo/eval/vibe-checklist.md` and the files under `docs/memo/eval/skills/` (binding for every screen touched)
- The frontend-design skill (invoke it before any UI work)
- `docs/curriculum/algebra1-outline.md` (unit 2, concept 2), `docs/content-review.md`
- `src/content/algebra1/linear-equations/s1.ts`, `src/content/lesson.ts`, `src/content/types.ts`
- `src/app/student/session/[id]/` (runner, panels, actions), `src/session/blocks.ts`
- Notes of milestones 13, 14 and 15

## Scope

In:

- Session workspace: the session route renders without the sidebar as a full-viewport layout. Top strip: breadcrumb (Algebra I › Unit 2 › Solving two-step linear equations · AI-A.REI.3), the five blocks as a progress strip with the current one marked, the block timer, and in problem blocks a counter ("Problem 2 of 5"). Main area: one problem at a time in warm-up, guided practice and the exit check, with Next after a correct answer (exit keeps its one-attempt rule). Right panel: Notes, a text area saved per session through a server action (plain text, 2,000 characters, zod-checked, stored on `session_logs.notes`), and a second tab "Write with a stylus" that shows a drawing surface labeled "Prototype: tablet writing arrives with the tablet app" and accepts mouse or touch strokes so it looks alive; nothing is saved from it. Phone width stacks the panel below the problem.
- Lesson access during practice: in guided practice, a "Key learnings" button opens the chapter's summary in the right panel, and "Open the chapter" opens the full chapter in the same panel, scrolled to the section the student picks, without leaving the problem. The coach panel keeps its place.
- Textbook chapter for two-step equations, as typed data in `src/content/algebra1/linear-equations/s1-chapter.ts` with a `Chapter` type in `src/content/types.ts`: sections in order, each with a heading, paragraphs, optional inline SVG diagram (balance scale for "do the same to both sides", a number line for the integer steps, a two-step "undo" ladder), optional worked example (steps as data, reusing `defineWorkedExample`), and optional video card. Required sections: what a two-step equation is; the balance idea; the two undo moves and their order; three worked examples (positive coefficient, negative coefficient, a word problem from S1's own templates); common mistakes (at least four, each with the wrong line and the fix); check your answer; key learnings (five to seven one-line statements); what comes next (variables on both sides, as upcoming). Reading level: short sentences, at or below 8th grade; the test caps sentence length. Video cards: two or three links to free, reputable sources (Khan Academy's two-step equations videos are the obvious choice); each URL must be fetched during the build session and return 200, and the content file records the title, source and the date verified; a link that cannot be verified is left out. Videos are links with a thumbnail-style card drawn in CSS, never an embed, so no third-party script loads.
- Learn block UI: the chapter renders as a reading view with a left table of contents, the worked examples keep the stepped reveal, and the "I've read this" gate stays at the end. The lesson's existing explanation paragraphs fold into the chapter rather than living beside it.
- `docs/content-review.md`: a chapter row, "drafted, not yet reviewed", with the video sources listed.
- Tests: chapter shape (required sections, key learnings count, every video verified field present, sentence-length cap), notes action validation, one-at-a-time flow in the smoke walk, key-learnings panel opens in guided practice.

Out (do not build, even if tempting):

- Chapters for any other concept; saving drawings; any change to the engine, the coach, the grader, the exit rule or the gate; embeds or external scripts.

## Acceptance criteria

1. A session fills the viewport with the strip, the counter, one problem at a time, and the notes panel; typed notes survive a reload.
2. The Learn block reads as a chapter with a table of contents, three worked examples, at least three diagrams, a common-mistakes section, verified video cards and key learnings.
3. In guided practice the key learnings open beside the problem without leaving it.
4. Every existing smoke path still passes with the one-at-a-time flow; every route scores 90 or better; the session route's first-load JS stays within the budget in force (see decision D48: 175 KB for the session route from this milestone on, measured and stated in the notes).
5. `scripts/gate.sh` exits 0 without an API key.

## Smoke path

Start the demo session → the workspace strip shows Unit 2 and the standard → warm-up shows "Problem 1 of 3" → answer three in turn → the chapter's table of contents lists the required sections → reveal a worked example → confirm reading → guided practice "Problem 1 of 5" → type a note, reload, the note is there → open Key learnings beside the problem → continue to the end as before.

## Notes for the next milestone

Filled in at the end of the session.
