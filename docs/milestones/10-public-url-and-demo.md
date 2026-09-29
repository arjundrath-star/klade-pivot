# Milestone 10: Public URL, demo seed, demo run

Status: not started
Session: one shot, then a human demo run

## Goal

The app runs in a browser at a public URL with no install, seeded with the demo persona, and the spec's three-minute demo script runs end to end without a hitch, twice. Everything needed to survive a bad conference-room network exists.

## Read first

- `docs/memo/02-mvp-spec-v1.md` §8 item 10, §9 (demo script)
- `.env.example`

## Scope

In:

- Hosting decision recorded in `docs/memo/03-decision-log.md` (Vercel with a hosted libSQL database, or the VPS behind the existing Cloudflare tunnel; pick the one that is live and verified first).
- Production database provisioned; `DATABASE_URL`, `DATABASE_AUTH_TOKEN`, `ANTHROPIC_API_KEY`, `NEXT_PUBLIC_APP_URL` set in the host's environment, never in the repo.
- `npm run db:seed -- --demo` seeds Maya with one completed session (mastered, with a real explain-back transcript captured from a genuine run, not invented) and one scheduled session for today, so the parent view has history before the live demo starts.
- `/admin` gets a "Reset demo" action that restores that exact state.
- Offline fallback documented in `docs/demo-runbook.md`: how to run the production build locally on the laptop with the file database, the exact `npm` commands, and the order of clicks from spec §9 with expected screens.
- Lighthouse `ROUTES` covers `/`, `/student`, `/parent`, `/admin`, `/onboarding` and all score 90 or better against the deployed URL (run `scripts/lighthouse.mjs` with `BASE` pointed at production, add a `--base` flag).
- README status section updated with the URL and three screenshots (session, explain-back result, parent view) in `docs/screenshots/`.

Out:

- Custom domain, analytics, payments.

## Acceptance criteria

1. Runs in a browser at a public URL; no install. AC 10.
2. The §9 demo script completes twice in a row on the public URL, including the coach refusal and the voice explain-back in Chrome, with no console errors.
3. "Reset demo" returns the app to the seeded state in under 5 s.
4. The local fallback boots from a fresh terminal in under 60 s following the runbook.
5. CI green; `scripts/gate.sh` exits 0.

## Smoke path

The full §9 script, automated where the model is not involved; the coach and grader steps are asserted on the visible UI states with the API key unset.

## Notes

Filled in at the end of the session.
