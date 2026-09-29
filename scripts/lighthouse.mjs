// Performance budget check. Boots the production build, runs Lighthouse on each
// route in ROUTES, and fails if any category score is under its threshold or a
// route's first load transfers more than FIRST_LOAD_JS_BUDGET of JavaScript.
// Requires `next build` to have run first (scripts/gate.sh does this).
import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync } from "node:fs";

const PORT = 3101;
const BASE = `http://localhost:${PORT}`;
const ROUTES = ["/", "/student"];
const THRESHOLDS = { performance: 0.9, accessibility: 0.9, "best-practices": 0.9 };
// The performance score is timing-based and swings on a busy 2-core host, so a
// route gets up to this many performance runs and passes if any one meets the
// threshold. Accessibility and best-practices are deterministic: one run.
const PERFORMANCE_RUNS = 3;
// Next 16's build output no longer prints route sizes, so the 150 KB rule for
// first-load JS is measured here: script bytes over the wire on a cold load.
const FIRST_LOAD_JS_BUDGET = 150 * 1000;
const OUT_DIR = "lighthouse";

function chromePath() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  for (const p of ["/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser"]) {
    if (existsSync(p)) return p;
  }
  return undefined;
}

const chrome = chromePath();
const auditEnv = chrome ? { ...process.env, CHROME_PATH: chrome } : process.env;

// Runs Lighthouse on one route for `categories` and returns the parsed report,
// or null when Lighthouse itself failed.
function audit(route, out, categories) {
  const res = spawnSync(
    "npx",
    [
      "lighthouse",
      `${BASE}${route}`,
      "--output=json",
      `--output-path=${out}`,
      `--only-categories=${categories.join(",")}`,
      // Desktop preset: the product runs on Chromebooks and laptops, and the
      // mobile preset's 4x CPU slowdown makes scores noise on small CI hosts.
      "--preset=desktop",
      "--chrome-flags=--headless=new --no-sandbox --disable-gpu --disable-dev-shm-usage",
      "--quiet",
    ],
    { stdio: ["ignore", "inherit", "inherit"], env: auditEnv },
  );
  if (res.status !== 0 || !existsSync(out)) return null;
  return JSON.parse(readFileSync(out, "utf8"));
}

// Bytes of JavaScript the route transferred, compressed, on the audited load.
function scriptBytes(report) {
  const items = report.audits["resource-summary"]?.details?.items ?? [];
  return items.find((item) => item.resourceType === "script")?.transferSize ?? 0;
}

const score = (report, cat) => report.categories[cat]?.score ?? 0;
const pct = (value) => Math.round(value * 100);

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
    // Render the route once first, so the audit does not time a cold module load.
    try {
      await (await fetch(`${BASE}${route}`)).arrayBuffer();
    } catch {
      /* a route that does not answer fails its audit below */
    }
    const report = audit(route, `${OUT_DIR}/${name}.json`, Object.keys(THRESHOLDS));
    if (!report) {
      console.error(`lighthouse failed for ${route}`);
      failed = true;
      continue;
    }

    const perfScores = [score(report, "performance")];
    while (perfScores.at(-1) < THRESHOLDS.performance && perfScores.length < PERFORMANCE_RUNS) {
      const rerun = audit(route, `${OUT_DIR}/${name}-perf-${perfScores.length + 1}.json`, [
        "performance",
      ]);
      if (!rerun) break;
      perfScores.push(score(rerun, "performance"));
    }

    const line = [];
    for (const [cat, min] of Object.entries(THRESHOLDS)) {
      const best = cat === "performance" ? Math.max(...perfScores) : score(report, cat);
      const ok = best >= min;
      if (!ok) failed = true;
      const runs = cat === "performance" && perfScores.length > 1;
      const detail = runs ? ` (runs ${perfScores.map(pct).join("/")})` : "";
      line.push(`${cat}=${pct(best)}${detail}${ok ? "" : ` (below ${pct(min)})`}`);
    }
    const js = scriptBytes(report);
    const jsOk = js > 0 && js <= FIRST_LOAD_JS_BUDGET;
    if (!jsOk) failed = true;
    const budget = jsOk ? "" : ` (over ${FIRST_LOAD_JS_BUDGET / 1000} KB or not measured)`;
    line.push(`first-load-js=${(js / 1000).toFixed(1)}KB${budget}`);
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
