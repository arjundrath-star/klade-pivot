// Performance budget check. Boots the production build, runs Lighthouse on each
// route in ROUTES, and fails if any category score is under its threshold.
// Requires `next build` to have run first (scripts/gate.sh does this).
import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync } from "node:fs";

const PORT = 3101;
const BASE = `http://localhost:${PORT}`;
const ROUTES = ["/", "/student"];
const THRESHOLDS = { performance: 0.9, accessibility: 0.9, "best-practices": 0.9 };
const OUT_DIR = "lighthouse";

function chromePath() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  for (const p of ["/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser"]) {
    if (existsSync(p)) return p;
  }
  return undefined;
}

async function waitFor(url, ms) {
  const deadline = Date.now() + ms;
  while (Date.now() < deadline) {
    try {
      const r = await fetch(url);
      if (r.ok) return;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`server did not answer at ${url} within ${ms}ms`);
}

// A fresh, seeded database with a session open, so /student and the session page render the
// demo student's real pages. The session route has a generated id, so it is appended here.
const serverEnv = { ...process.env, DATABASE_URL: "file:./data/lighthouse.db" };
const seeded = spawnSync("npm", ["run", "-s", "db:reset", "--", "--open-session"], {
  stdio: ["ignore", "pipe", "inherit"],
  encoding: "utf8",
  env: serverEnv,
});
const sessionRoute = seeded.stdout?.match(/^\/student\/session\/\S+$/m)?.[0];
if (seeded.status !== 0 || !sessionRoute) {
  console.error(`seeding the lighthouse database failed\n${seeded.stdout ?? ""}`);
  process.exit(1);
}

// Detached so the whole process group (npx → next → next-server) can be
// killed at the end; otherwise the server outlives this script and keeps
// stdio pipes open, which hangs any caller that waits on our output.
const server = spawn("npx", ["next", "start", "-p", String(PORT)], {
  stdio: "ignore",
  detached: true,
  env: serverEnv,
});
let failed = false;
try {
  await waitFor(BASE, 60_000);
  mkdirSync(OUT_DIR, { recursive: true });
  for (const route of [...ROUTES, sessionRoute]) {
    const name = route === "/" ? "home" : route.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "");
    const out = `${OUT_DIR}/${name}.json`;
    const env = { ...process.env };
    const chrome = chromePath();
    if (chrome) env.CHROME_PATH = chrome;
    const res = spawnSync(
      "npx",
      [
        "lighthouse",
        `${BASE}${route}`,
        "--output=json",
        `--output-path=${out}`,
        "--only-categories=performance,accessibility,best-practices",
        // Desktop preset: the product runs on Chromebooks and laptops, and the
        // mobile preset's 4x CPU slowdown makes scores noise on small CI hosts.
        "--preset=desktop",
        "--chrome-flags=--headless=new --no-sandbox --disable-gpu --disable-dev-shm-usage",
        "--quiet",
      ],
      { stdio: ["ignore", "inherit", "inherit"], env },
    );
    if (res.status !== 0 || !existsSync(out)) {
      console.error(`lighthouse failed for ${route}`);
      failed = true;
      continue;
    }
    const report = JSON.parse(readFileSync(out, "utf8"));
    const line = [];
    for (const [cat, min] of Object.entries(THRESHOLDS)) {
      const score = report.categories[cat]?.score ?? 0;
      const ok = score >= min;
      if (!ok) failed = true;
      line.push(`${cat}=${Math.round(score * 100)}${ok ? "" : " (below " + min * 100 + ")"}`);
    }
    console.log(`${route}: ${line.join("  ")}`);
  }
} finally {
  try {
    process.kill(-server.pid, "SIGTERM");
  } catch {
    server.kill("SIGTERM");
  }
}
process.exit(failed ? 1 : 0);
