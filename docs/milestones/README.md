# Build plan

One milestone per one-shot session, in this order. Each derives from `docs/memo/02-mvp-spec-v1.md`; section numbers below refer to it. Acceptance criteria (AC) numbers refer to spec §8.

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
| 09  | Session 2 content and weekly digest            | §2, §3.6, §11.9         | 8                |
| 10  | Public URL, demo seed, demo run                | §8 item 10, §9, §11.10  | 10               |

Session 3 (distributing and combining like terms) is built only if 01 to 10 are done before Thursday night.

Prompt for a one-shot session:

```
Build docs/milestones/NN-<name>.md. Follow CLAUDE.md. Stop when the gate passes, the work is committed and pushed, CI is green, and the milestone's notes section is filled in.
```
