import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { DEMO_FAMILY_ID, DEMO_STUDENT_ID } from "@/db/demo";
import { gateUrl } from "@/gate/paths";
import { GATE_COOKIE, gateOpen } from "@/gate/token";

/** The family a parent or admin page acts for, and the student it shows. */
export interface GatedFamily {
  familyId: string;
  studentId: string;
}

/**
 * The family this request's browser may act for: the demo family once it has signed in at the
 * gate (sign-in is not built yet, so every signed-in browser is the demo parent), else null. The
 * one place the parent and admin code learns which ids to use.
 */
export async function signedInFamily(): Promise<GatedFamily | null> {
  const token = (await cookies()).get(GATE_COOKIE)?.value;
  if (!gateOpen(token, process.env.ADMIN_PASSWORD)) return null;
  return { familyId: DEMO_FAMILY_ID, studentId: DEMO_STUDENT_ID };
}

/**
 * `signedInFamily` for pages, actions and routes that cannot go on without it: a browser that has
 * not signed in is sent to the gate, to come back to `next`. The proxy already keeps such a
 * browser off the pages; this is the check behind it, since a server action can be posted to any
 * route.
 */
export async function gatedFamily(next: string): Promise<GatedFamily> {
  const family = await signedInFamily();
  if (!family) redirect(gateUrl(next));
  return family;
}
