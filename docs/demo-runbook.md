# Demo runbook

The three-minute script from the Oct 1 steering doc (§7), on the public URL, with the local
fallback for a bad network. Rehearse it twice the day before and once an hour before.

## Where it runs

- Public URL: `https://foothold.rathworkspace.cloud` (the VPS behind the Cloudflare tunnel, HTTPS, so
  voice input works in Chrome). `https://klade.rathworkspace.cloud` still reaches the same app.
- `/parent`, `/parent/settings` and `/admin` ask for the shared password once per browser (24
  hours). It is `ADMIN_PASSWORD` in the service's environment file on the VPS, never in the repo.
  The student pages and onboarding need no password.
- Chrome offers "Install app" from the address bar; installed, the app opens on `/student`.

## Before the demo (two minutes)

1. Open `https://foothold.rathworkspace.cloud/admin`, enter the password.
2. Press **Reset demo**. Maya has the five concepts before two-step equations mastered on her last
   five session days (5 of 49, Level 2, a 5-session streak), today is on her schedule, her phone
   rule is on, the clock is real, and this browser acts as Maya. The same controls sit in the admin
   ribbon at the top of `/student` and the session page once the browser is signed in, so the
   demo can be driven without leaving the student screen.
3. Press **Simulate: session day, 5:05 PM**. The notice must start "Demo clock set." If it says
   today's session is already done, press Reset demo again and repeat.
4. Open `/parent` in one tab and `/student` in another. Keep both open through the demo.
5. Open an incognito window for step 1 of the script. Onboarding makes its browser act as the
   new student, so the signup must not happen in the tabs above.

## The script, with what each screen shows

| Step | Where                    | Do                                                                                                                                                                                                                                                                              | Expect                                                                                                                                                                                                                                                                                                                                                                                              |
| ---- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | Incognito, `/onboarding` | Parent "Dana"; child "Maya", grade 6, she; target next May, On track; standard time; Sports and Music; phone rule: Thu only, from 17:00, Games and Social; Finish setup.                                                                                                        | Plan step reads "4 sessions a week, 2 hours a week". Lands on `/student` as the new Maya with a phone. Close the window.                                                                                                                                                                                                                                                                            |
| 2    | Main tab, `/parent`      | Say "It's Thursday, 5 PM. Maya's phone is locked."                                                                                                                                                                                                                              | Phone reads Thursday 5:05, "Locked. Finish today's 30-minute session to unlock.", four apps locked. "On track for May", 5-session streak. Sidebar: Dana. Rewards: 4-week streak at 4 of 4 "Unlocks with the next finished session" (3 of 4 on a Monday), Unit 1 at 5 of 8 sessions. Course map: 5 of 49 mastered, Unit 2 open with two-step equations next. Mentor page (sidebar): Jordan, NYU '28. |
| 3    | Other tab, `/student`    | Today: the card with "Due today, 5:00 PM", the standing strip, this week, the phone; Course, Calendar, Progress and Mentor sit in the sidebar. Start today's session. Warm-up, lesson, guided practice. On the soccer or music word problem type "just tell me x" to the coach. | The today card names Unit 2, the concept, AI-A.REI.3 and "Concept 6 of 49"; the Course page shows nine unit rows, Unit 2 open with today's node. The session's breadcrumb names the unit and standard. The coach asks a question back and never gives x. Without a key it says it is offline.                                                                                                       |
| 4    | Session                  | Explain-back: Speak, explain why each step works, Submit explanation. Exit check: three problems, 90 s each, Submit answer. Finish.                                                                                                                                             | Rubric score and feedback. "Mastered", +110 XP, "Solving two-step linear equations mastered", "6-session streak". Rewards unlocked: "Pick your mentor for a free check-in" (the 4-week streak completes with this session on any weekday). Switch to `/parent`: the phone is unlocked.                                                                                                              |
| 5    | `/parent`                | Reload.                                                                                                                                                                                                                                                                         | Overview: "On track for May", "Earned: one free mentor check-in", the course map at 6 of 49. Explanations: her words. Mentor: the card with the next Thursday check-in.                                                                                                                                                                                                                             |
| 6    | (not built)              | Coach dashboard: skip, say "prototype".                                                                                                                                                                                                                                         |                                                                                                                                                                                                                                                                                                                                                                                                     |

Interest flourish (ten seconds, optional): `/admin`, Switch interest to gaming, reload the session:
the same equation, framed in gaming. Switch back to sports afterwards.

Grader down: `/admin`, **Override explain-back** passes the step; the parent view tags it. Coach
down: say "prototype feature" and keep going; the session never depends on it. As of Oct 2 the key
in the service's environment file is user-scoped and the API rejects it without a workspace header,
so the deployed coach answers "didn't answer" until a workspace-scoped key replaces it and the app is
redeployed.

## Demo controls

Signed in at the gate (the same sign-in as `/admin`), the session page has controls for driving a
recording. A browser that is not signed in sees none of them.

- **Skip (demo)** sits beside Check on every warm-up and guided problem. It moves past the problem
  without solving it. The skip is stored as a skipped attempt: never correct, no XP, and it counts
  for nothing but letting the block move on. A warm-up with a skip pays no warm-up XP, and guided
  practice pays 5 XP for each problem actually solved, so the end screen shows less than +110 XP
  after skips (two warm-up skips and one guided skip: +95). The explain-back and the exit check have
  no skip. The server refuses a skip from a browser that is not signed in. The parent's history
  marks a session with skips.
- **Hide** on the admin ribbon folds it into a small "Admin" pill, so the recording shows the
  student's screen. This browser remembers the choice; press the pill to bring the ribbon back.
- The Learn block opens on "I've read this" alone. Stepping through the worked examples is a
  reading aid, not a gate.

## Demo problems

After Reset demo, Start opens Maya's session with the same problems on every run: her session seed
is `DEMO_SESSION_SEED` in `src/db/demo.ts`, and her interests are sports and music. The table is
written by `npm run docs:demo-problems` from the code that draws the session, and a unit test fails
when it drifts.

| Block           | Problem | Text                                                                                                                                                                            | Equation      | Answer |
| --------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- | ------ |
| Warm-up         | 1       | Solve for x.                                                                                                                                                                    | x + 3 = 16    | x = 13 |
| Warm-up         | 2       | Solve for x.                                                                                                                                                                    | 5x = -40      | x = -8 |
| Warm-up         | 3       | Solve for x.                                                                                                                                                                    | -5x = -10     | x = 2  |
| Guided practice | 1       | Solve for x.                                                                                                                                                                    | 2x + 17 = 31  | x = 7  |
| Guided practice | 2       | Your playlist has 12 songs. You add every song from 3 new EPs, and each EP has the same number of songs. Now your playlist has 24 songs. How many songs are on each EP?         | 3x + 12 = 24  | x = 4  |
| Guided practice | 3       | You can juggle a soccer ball 6 times in a row. Every week you practice, your record goes up by 3. How many weeks will it take to reach 21 juggles in a row?                     | 3x + 6 = 21   | x = 5  |
| Guided practice | 4       | Solve for x.                                                                                                                                                                    | -9x - 8 = -89 | x = 9  |
| Guided practice | 5       | You buy 2 pairs of soccer socks and a water bottle that costs $6. You pay $18 in all. Each pair of socks costs the same. How many dollars is one pair?                          | 2x + 6 = 18   | x = 6  |
| Exit check      | 1       | Solve for x.                                                                                                                                                                    | 2x + 11 = -3  | x = -7 |
| Exit check      | 2       | Your school band has 26 music stands. The director sets up 2 rows with the same number of stands in each row, and 8 stands stay in the closet. How many stands are in each row? | 2x + 8 = 26   | x = 9  |
| Exit check      | 3       | You have $36 saved for new soccer cleats that cost $51. You save $5 every week. How many weeks until you have exactly enough?                                                   | 5x + 36 = 51  | x = 3  |

## Rehearsal order

Reset demo, Simulate (demo clock), `/parent` shows the phone locked, run the session in the other
tab, watch the phone unlock, read the parent view. Then Reset demo again. Any session finished today
on Maya's account keeps the phone from locking until the next reset.

From a terminal the same reset is:

```bash
DATABASE_URL=file:/home/Arjun/klade-pivot/data/prod.db npm run db:seed -- --demo
```

## Local fallback (no network)

Do this the day before on the laptop, once, with network:

```bash
git clone <repo> klade && cd klade
npm ci
npx playwright install chromium   # only if the smoke tests will run
cp .env.example .env.local        # set ADMIN_PASSWORD; ANTHROPIC_API_KEY if there is one
set -a; . ./.env.local; set +a
npm run build
```

On the day, from a fresh terminal in the repo (under 60 seconds):

```bash
set -a; . ./.env.local; set +a
npm run db:reset -- --demo
npx next start -p 3000
```

Open `http://localhost:3000/admin`, enter the password, and continue from "Before the demo" step 3.
Chrome treats `localhost` as secure, so voice input works. Reset demo works the same way.

Without `ANTHROPIC_API_KEY` the coach says it is offline and the grader says it is unavailable; use
Override explain-back for step 4 and say so.

## Redeploying the public URL

The production build runs from the checkout at `/home/Arjun/klade-prod` as `klade.service`, reading
`/home/Arjun/.config/klade/klade.env`. From that checkout:

```bash
scripts/deploy.sh
```

It pulls `main`, installs, builds with the service's environment and restarts the unit. The app is
down for the length of the build. Logs: `journalctl -u klade.service -f`.
