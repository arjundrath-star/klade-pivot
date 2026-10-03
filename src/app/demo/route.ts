import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createVisitor } from "@/db/visitors";
import { signedInFamily } from "@/gate/server";
import { STATIC_HTML_HEADERS } from "@/http/static-html";
import { STUDENT_COOKIE, studentIdOf } from "@/session/student-cookie";
import { DemoNext } from "@/visitor/next-path";
import { sweepVisitors } from "@/visitor/sweep";

/**
 * What a browser sees when it reaches here without the cookie the proxy just set: cookies are off
 * for this site, and the demo keeps each browser's copy in one. Plain HTML, nothing to run.
 */
const COOKIES_NEEDED = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Foothold needs cookies</title>
<style>
body { margin: 0; padding: 3rem 1.5rem; font: 1.0625rem/1.6 system-ui, sans-serif; color: #1c2430; background: #fff; }
main { max-width: 36rem; margin: 0 auto; }
h1 { font-size: 1.75rem; line-height: 1.2; margin: 0 0 1rem; }
p { margin: 0 0 1rem; }
</style>
</head>
<body>
<main>
<h1>The demo needs cookies</h1>
<p>Each browser gets its own copy of the demo, and a cookie is what tells the copies apart.</p>
<p>Allow cookies for this site, then open the link again.</p>
</main>
</body>
</html>
`;

/**
 * Where the proxy sends a browser that is nobody yet (milestone 20): with the student cookie the
 * proxy set, it writes that id's copy of the demo persona, then sweeps copies past their 48 hours
 * when an hour has gone since the last sweep, and sends the browser on to `next`, one of the
 * student's or the parent's pages. A browser already signed in at the gate just goes on. Without
 * a cookie, the browser is not keeping them, and the page says so instead of sending it round
 * again.
 */
export async function GET(request: Request): Promise<Response> {
  const next = DemoNext.parse(new URL(request.url).searchParams.get("next"));
  if (await signedInFamily()) redirect(next);
  const studentId = studentIdOf((await cookies()).get(STUDENT_COOKIE)?.value);
  if (!studentId) return new Response(COOKIES_NEEDED, { headers: STATIC_HTML_HEADERS });
  const now = new Date();
  await createVisitor(studentId, now);
  await sweepVisitors(now);
  redirect(next);
}
