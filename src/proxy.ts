import { NextResponse, type NextRequest } from "next/server";
import { gateUrl } from "@/gate/paths";
import { GATE_COOKIE, gateOpen } from "@/gate/token";

/**
 * The gate in front of the parent and admin views: a browser without a valid gate cookie is sent
 * to /gate and comes back to the page it asked for, query and all. The matcher decides which paths
 * this runs on; the student routes, onboarding, the home page and the gate itself are never
 * matched. The pages, actions and routes behind it check the cookie again through `gatedFamily`,
 * since a server action can be posted to any route. 303, so a server action posted after the
 * cookie expired becomes a GET of the gate instead of a replay of its body.
 */
export function proxy(request: NextRequest): NextResponse {
  const token = request.cookies.get(GATE_COOKIE)?.value;
  if (gateOpen(token, process.env.ADMIN_PASSWORD)) return NextResponse.next();
  const { pathname, search } = request.nextUrl;
  return NextResponse.redirect(new URL(gateUrl(pathname + search), request.url), 303);
}

export const config = {
  // Whole segments only: /admin and /parent and everything below them, never /parents.
  matcher: ["/admin", "/admin/:path*", "/parent", "/parent/:path*"],
};
