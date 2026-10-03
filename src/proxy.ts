import { NextResponse, type NextRequest } from "next/server";
import { adminPath, gateUrl } from "@/gate/paths";
import { GATE_COOKIE, gateOpen } from "@/gate/token";
import { httpOnlyCookie, SCHOOL_YEAR_SECONDS } from "@/session/cookies";
import { STUDENT_COOKIE, studentIdOf } from "@/session/student-cookie";
import { demoUrl } from "@/visitor/paths";

/**
 * Who a browser is, decided before any page runs. A browser with a valid gate cookie is the
 * founder's and goes anywhere. Without one, the admin panel sends it to /gate, to come back to
 * the page it asked for, query and all (303, so a server action posted after the cookie expired
 * becomes a GET of the gate instead of a replay of its body). The student's and the parent's
 * pages need a student cookie: a browser without one gets a fresh id and goes to /demo, which
 * writes that id's copy of the demo persona and sends the browser back here (milestone 20). The
 * matcher decides which paths this runs on; the pages, actions and routes check the cookies
 * again, since a server action can be posted to any route.
 */
export function proxy(request: NextRequest): NextResponse {
  const token = request.cookies.get(GATE_COOKIE)?.value;
  if (gateOpen(token, process.env.ADMIN_PASSWORD)) return NextResponse.next();
  const { pathname, search } = request.nextUrl;
  if (adminPath(pathname)) {
    return NextResponse.redirect(new URL(gateUrl(pathname + search), request.url), 303);
  }
  if (studentIdOf(request.cookies.get(STUDENT_COOKIE)?.value)) return NextResponse.next();
  const response = NextResponse.redirect(new URL(demoUrl(pathname + search), request.url), 303);
  response.cookies.set(STUDENT_COOKIE, crypto.randomUUID(), httpOnlyCookie(SCHOOL_YEAR_SECONDS));
  return response;
}

export const config = {
  // Whole segments only: /admin, /parent and /student and everything below them, never /parents.
  matcher: ["/admin", "/admin/:path*", "/parent", "/parent/:path*", "/student", "/student/:path*"],
};
