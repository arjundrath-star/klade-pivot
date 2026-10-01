import { NextResponse } from "next/server";
import { z } from "zod";
import { blocked, clearFailures, clientAddress, recordFailure } from "@/gate/attempts";
import { NextPath } from "@/gate/next-path";
import { gateUrl } from "@/gate/paths";
import type { GateNotice } from "@/gate/notices";
import { freshGateToken, GATE_COOKIE, GATE_MAX_AGE_SECONDS, secretsMatch } from "@/gate/token";
import { httpOnlyCookie } from "@/session/cookies";

const Form = z.strictObject({
  password: z.string().min(1).max(200),
  next: NextPath,
});

/** A 303 to a path on this site. Relative, so it holds whatever host the tunnel presents. */
function seeOther(location: string): NextResponse {
  return new NextResponse(null, { status: 303, headers: { Location: location } });
}

function back(next: string, notice: GateNotice): NextResponse {
  return seeOther(`${gateUrl(next)}&notice=${notice}`);
}

/**
 * The gate's form posts here. A right password sets the gate cookie and sends the browser on to
 * the page it wanted; a wrong one goes back to the form with a notice, and too many wrong ones
 * from one address wait out the window.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const form = await request.formData().catch(() => undefined);
  const parsed = Form.safeParse(form && Object.fromEntries(form));
  // A form that fails as a whole still goes back to where the browser was going, when that is sound.
  const next = NextPath.safeParse(form?.get("next"));
  if (!parsed.success) return back(next.success ? next.data : "/admin", "invalid");

  const password = process.env.ADMIN_PASSWORD;
  if (!password) return back(parsed.data.next, "unset");

  const address = clientAddress(request.headers);
  if (blocked(address)) return back(parsed.data.next, "wait");
  if (!secretsMatch(parsed.data.password, password)) {
    recordFailure(address);
    return back(parsed.data.next, "wrong");
  }
  clearFailures(address);

  const response = seeOther(parsed.data.next);
  response.cookies.set(GATE_COOKIE, freshGateToken(password), httpOnlyCookie(GATE_MAX_AGE_SECONDS));
  return response;
}
