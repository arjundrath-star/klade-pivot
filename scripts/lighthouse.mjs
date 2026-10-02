// Performance budget check. Boots the production build, runs Lighthouse on each
// route in ROUTES, and fails if any category score is under its threshold or a
// route's first load transfers more than FIRST_LOAD_JS_BUDGET of JavaScript.
// Requires `next build` to have run first (scripts/gate.sh does this).
//
// With --base <url> it audits a deployed app instead of booting one: no seeding,
// no server, and no session route (that needs a session opened for the demo
// student). The deployed app's ADMIN_PASSWORD must be in the environment, so the
// routes behind the gate are measured and not the gate page.
import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { parseArgs } from "node:util";

const PORT = 3101;
const ROUTES = [
  "/",
  "/onboarding",
  "/student",
  "/student/course",
  "/student/calendar",
  "/student/progress",
  "/student/mentor",
  "/parent",
  "/parent/explanations",
  "/parent/alerts",
  "/parent/settings",
  "/parent/mentor",
  "/admin",
  "/mentor/waiting-room",
  "/gate",
];
const THRESHOLDS = { performance: 0.9, accessibility: 0.9, "best-practices": 0.9 };
// The performance score is timing-based and swings on a busy 2-core host, so a
// route gets up to this many performance runs and passes if any one meets the
// threshold. Accessibility and best-practices are deterministic: one run.
const PERFORMANCE_RUNS = 3;
// Next 16's build output no longer prints route sizes, so the 150 KB rule for
// first-load JS is measured here: script bytes over the wire on a cold load.
const FIRST_LOAD_JS_BUDGET = 150 * 1000;
const OUT_DIR = "lighthouse";

const { values: args } = parseArgs({ options: { base: { type: "string" } } });
const remote = args.base?.replace(/\/$/, "");
const BASE = remote ?? `http://localhost:${PORT}`;
// Local runs start the server with a throwaway password; remote runs need the real one.
const password = process.env.ADMIN_PASSWORD || (remote ? undefined : "lighthouse");
if (!password) {
  console.error("--base needs ADMIN_PASSWORD in the environment to audit the gated routes");
  process.exit(2);
}

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
// or null when Lighthouse itself failed. The gate cookie goes with every request.
function audit(route, out, categories, cookie) {
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
      `--extra-headers=${JSON.stringify({ Cookie: cookie })}`,
    ],
    { stdio: ["ignore", "inherit", "inherit"], env: auditEnv },
  );
  if (res.status !== 0 || !existsSync(out)) return null;
  return JSON.parse(readFileSync(out, "utf8"));
}

// Bytes of the app's own JavaScript the route transferred, compressed, on the
// audited load: the scripts served from the audited origin. A CDN in front of
// the deployed app adds scripts of its own (Cloudflare's analytics beacon),
// which are not the app's budget.
function scriptBytes(report) {
  const origin = new URL(report.requestedUrl).origin;
  const items = report.audits["network-requests"]?.details?.items ?? [];
  return items
    .filter((item) => item.resourceType === "Script" && item.url.startsWith(`${origin}/`))
    .reduce((sum, item) => sum + (item.transferSize ?? 0), 0);
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

// Signs in at the gate the way the form does and returns the cookie it sets.
async function gateCookie() {
  const body = new URLSearchParams({ password, next: "/admin" });
  const response = await fetch(`${BASE}/gate/enter`, { method: "POST", body, redirect: "manual" });
  const cookie = response.headers
    .getSetCookie()
    .map((header) => header.split(";")[0])
    .find((pair) => pair.startsWith("klade_gate="));
  if (!cookie) throw new Error(`the gate did not sign in (status ${response.status})`);
  return cookie;
}

let server;
let routes = ROUTES;
if (!remote) {
  // A fresh database in the demo's starting state with a session open, so /student and the
  // session page render the demo student's real pages. The session route has a generated id, so
  // it is appended here.
  const serverEnv = {
    ...process.env,
    DATABASE_URL: "file:./data/lighthouse.db",
    ADMIN_PASSWORD: password,
  };
  const seeded = spawnSync("npm", ["run", "-s", "db:reset", "--", "--demo", "--open-session"], {
    stdio: ["ignore", "pipe", "inherit"],
    encoding: "utf8",
    env: serverEnv,
  });
  const sessionRoute = seeded.stdout?.match(/^\/student\/session\/\S+$/m)?.[0];
  if (seeded.status !== 0 || !sessionRoute) {
    console.error(`seeding the lighthouse database failed\n${seeded.stdout ?? ""}`);
    process.exit(1);
  }
  routes = [...ROUTES, sessionRoute];

  // Detached so the whole process group (npx → next → next-server) can be
  // killed at the end; otherwise the server outlives this script and keeps
  // stdio pipes open, which hangs any caller that waits on our output.
  server = spawn("npx", ["next", "start", "-p", String(PORT)], {
    stdio: "ignore",
    detached: true,
    env: serverEnv,
  });
}

let failed = false;
try {
  await waitFor(BASE, 60_000);
  const cookie = await gateCookie();
  mkdirSync(OUT_DIR, { recursive: true });
  for (const route of routes) {
    const name = route === "/" ? "home" : route.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "");
    // Render the route once first, so the audit does not time a cold module load, and make sure
    // the gate let it through: an audit of the gate page under this route's name would pass for
    // the wrong reason.
    try {
      const warm = await fetch(`${BASE}${route}`, { headers: { Cookie: cookie } });
      await warm.arrayBuffer();
      if (new URL(warm.url).pathname === "/gate" && route !== "/gate") {
        console.error(`${route}: the gate did not accept the cookie`);
        failed = true;
        continue;
      }
    } catch {
      /* a route that does not answer fails its audit below */
    }
    const report = audit(route, `${OUT_DIR}/${name}.json`, Object.keys(THRESHOLDS), cookie);
    if (!report) {
      console.error(`lighthouse failed for ${route}`);
      failed = true;
      continue;
    }

    const perfScores = [score(report, "performance")];
    while (perfScores.at(-1) < THRESHOLDS.performance && perfScores.length < PERFORMANCE_RUNS) {
      const rerun = audit(
        route,
        `${OUT_DIR}/${name}-perf-${perfScores.length + 1}.json`,
        ["performance"],
        cookie,
      );
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
  if (server) {
    try {
      process.kill(-server.pid, "SIGTERM");
    } catch {
      server.kill("SIGTERM");
    }
  }
}
process.exit(failed ? 1 : 0);
