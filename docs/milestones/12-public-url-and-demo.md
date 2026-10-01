# Milestone 12: Public URL, demo seed, demo run

Status: not started
Session: one shot, then a human demo run

## Goal

The app runs in a browser at a public URL with no install, seeded with the demo persona, and the three-minute demo script in `docs/memo/08-mvp-steering-oct1.md` §7 runs end to end without a hitch, twice. Everything needed to survive a bad conference-room network exists.

## Read first

- `docs/memo/02-mvp-spec-v1.md` §8 item 10
- `docs/memo/08-mvp-steering-oct1.md` §6 (HTTPS, manifest, cut order) and §7 (demo script)
- `.env.example`

## Scope

In:

- Hosting decision recorded in `docs/memo/03-decision-log.md` (Vercel with a hosted libSQL database, or the VPS behind the existing Cloudflare tunnel; pick the one that is live and verified first).
- Production database provisioned; `DATABASE_URL`, `DATABASE_AUTH_TOKEN`, `ANTHROPIC_API_KEY`, `NEXT_PUBLIC_APP_URL` set in the host's environment, never in the repo.
- `npm run db:seed -- --demo` seeds Maya on track (no missed session; the missed-session alert is demonstrated from `/admin` on demand, decision D43) with one completed session (mastered, real explain-back transcript from a genuine run, not invented), one scheduled session for today, the lock rule active for today with the demo clock at 5:05 PM so the phone panel opens locked, the 4-week-streak reward at 3 of 4, and the mentor card for Jordan, NYU '28, so every demo surface has state before the live run starts.
- `/admin` gets a "Reset demo" action that restores that exact state.
- Offline fallback documented in `docs/demo-runbook.md`: how to run the production build locally on the laptop with the file database, the exact `npm` commands, and the order of clicks from steering §7 with expected screens.
- HTTPS on the public URL, required for browser voice input: Cloudflare Tunnel in front of the production build on the VPS, or Vercel, whichever the hosting decision picks.
- Web-app manifest and icons so Chrome offers Install app; served from the app, no CDN.
- Lighthouse `ROUTES` covers `/`, `/student`, `/parent`, `/parent/settings`, `/admin`, `/onboarding`, `/mentor/waiting-room` and all score 90 or better against the deployed URL (run `scripts/lighthouse.mjs` with `BASE` pointed at production, add a `--base` flag).
- README status section updated with the URL and three screenshots in demo order (phone panel locked, session with the coach refusing, parent view with the explanation and the reward line) in `docs/screenshots/`.

Out:

- Custom domain, analytics, payments.

## Acceptance criteria

1. Runs in a browser at a public URL; no install. AC 10.
2. The steering §7 demo script completes twice in a row on the public URL, including the coach refusal, the voice explain-back in Chrome, and the phone panel unlocking live, with no console errors.
3. "Reset demo" returns the app to the seeded state in under 5 s.
4. The local fallback boots from a fresh terminal in under 60 s following the runbook.
5. CI green; `scripts/gate.sh` exits 0.

## Smoke path

The full steering §7 script in order: `/onboarding` with the Thursday 5 PM rule → `/admin` demo clock → `/parent` phone panel locked → the session → unlock with XP, badge and reward progress → `/parent` with the explanation, the reward line and the mentor card; automated where the model is not involved; the coach and grader steps are asserted on the visible UI states with the API key unset.

## Notes

Filled in at the end of the session.
