# Demo runbook

The three-minute script from the Oct 1 steering doc (§7), on the public URL, with the local
fallback for a bad network. Rehearse it twice the day before and once an hour before.

## Where it runs

- Public URL: `https://klade.rathworkspace.cloud` (the VPS behind the Cloudflare tunnel, HTTPS, so
  voice input works in Chrome).
- `/parent`, `/parent/settings` and `/admin` ask for the shared password once per browser (24
  hours). It is `ADMIN_PASSWORD` in the service's environment file on the VPS, never in the repo.
  The student pages and onboarding need no password.
- Chrome offers "Install app" from the address bar; installed, the app opens on `/student`.

## Before the demo (two minutes)

1. Open `https://klade.rathworkspace.cloud/admin`, enter the password.
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

| Step | Where                    | Do                                                                                                                                                                                                                                                                | Expect                                                                                                                                                                                                                                                                                             |
| ---- | ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | Incognito, `/onboarding` | Parent "Dana"; child "Maya", grade 6, she; target next May, On track; standard time; Sports and Music; phone rule: Thu only, from 17:00, Games and Social; Finish setup.                                                                                          | Plan step reads "4 sessions a week, 2 hours a week". Lands on `/student` as the new Maya with a phone. Close the window.                                                                                                                                                                           |
| 2    | Main tab, `/parent`      | Say "It's Thursday, 5 PM. Maya's phone is locked."                                                                                                                                                                                                                | Phone reads Thursday 5:05, "Locked. Finish today's 30-minute session to unlock.", four apps locked. "On track for May", 5-session streak. Rewards: 4-week streak 3 of 4, Unit 1 at 5 of 8 sessions. Course map: 5 of 49 mastered, two-step equations next. Mentor page (sidebar): Jordan, NYU '28. |
| 3    | Other tab, `/student`    | Home: the class selector, today's card, progress, level, streak, this week, the phone; Course, Calendar, Progress and Mentor sit in the sidebar. Start. Warm-up, lesson, guided practice. On the soccer or music word problem type "just tell me x" to the coach. | The today card names Unit 2, the concept, AI-A.REI.3 and "Concept 6 of 49"; the Course page shows five mastered nodes and today's. The session's breadcrumb names the unit and standard. The coach asks a question back and never gives x. Without a key it says it is offline.                    |
| 4    | Session                  | Explain-back: Speak, explain why each step works, Submit. Exit check: three problems, 90 s each. Finish.                                                                                                                                                          | Rubric score and feedback. "Mastered", +110 XP, "Solving two-step linear equations mastered", "6-session streak". Switch to `/parent`: the phone is unlocked. The 4-week streak reward unlocks here only when the demo day is a Monday (a new calendar week); otherwise it stays at 3 of 4.        |
| 5    | `/parent`                | Reload.                                                                                                                                                                                                                                                           | Overview: "On track for May", the course map at 6 of 49. Explanations: her words. Mentor: the card with the next Thursday check-in.                                                                                                                                                                |
| 6    | (not built)              | Coach dashboard: skip, say "prototype".                                                                                                                                                                                                                           |                                                                                                                                                                                                                                                                                                    |

Interest flourish (ten seconds, optional): `/admin`, Switch interest to gaming, reload the session:
the same equation, framed in gaming. Switch back to sports afterwards.

Grader down: `/admin`, **Override explain-back** passes the step; the parent view tags it. Coach
down: say "prototype feature" and keep going; the session never depends on it.

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
