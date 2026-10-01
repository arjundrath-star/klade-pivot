# Build plan

One milestone per one-shot session, in this order. Each derives from `docs/memo/02-mvp-spec-v1.md` or, from 09 on, from `docs/memo/08-mvp-steering-oct1.md` (Oct 1, overrides the spec where they conflict); `steering` below means that file. Acceptance criteria (AC) numbers refer to spec §8, or to steering §6 where marked.

| #   | Milestone                                      | Spec                    | Delivers AC      |
| --- | ---------------------------------------------- | ----------------------- | ---------------- |
| 01  | Problem engine                                 | §3.2a, §6, §11.1        | 12 (engine half) |
| 02  | Data layer and session shell                   | §3.2, §7, §11.2         | 2 (shell)        |
| 03  | Session 1 content with interest variants       | §2, §3.2a, §11.3        | 12               |
| 04  | Guardrailed coach                              | §3.3, §6, §11.4         | 3, 9 (logging)   |
| 05  | Explain-back and rubric grader                 | §3.2 block 4, §5, §11.5 | 4                |
| 06  | Exit check and mastery state                   | §3.2 block 5, §11.6     | 5, 11            |
| 07  | Parent view, admin panel, missed-session alert | §3.4, §3.5, §11.7       | 6, 7, 9          |
| 08  | Onboarding and pace calculator                 | §3.1, §11.8             | 1                |
| 09  | XP, streaks, levels, badges                    | steering §3.2           | steering 13      |
| 10  | Screen-time gate: rule builder and phone panel | steering §3.1, §5       | steering 15 to 18, 21 |
| 11  | Rewards panel and mentor cards                 | steering §3.3, §4.1     | steering 14, 19, 20 |
| 12  | Public URL, demo seed, demo run                | §8 item 10, steering §6, §7 | 10           |

Session 2 and 3 content and the weekly digest are cut from the MVP (decision D42, the steering doc's cut order); revisit after the pitch.

Prompt for a one-shot session:

```
Build docs/milestones/NN-<name>.md. Follow CLAUDE.md. Stop when the gate passes, the work is committed and pushed, CI is green, and the milestone's notes section is filled in.
```
