import { z } from "zod";
import { currentStudentId, parentViewer } from "@/session/current-student";
import { LOCK_VIEWERS } from "@/session/lock";
import { lockView } from "@/session/lock-status";

/**
 * Which page the phone panel sits on: `/parent` acts for the family the parent pages act for (the
 * demo family once signed in at the gate, else the cookie's student's); `/student` acts as the
 * current student. `reward=1` asks for what an unlocking session earned, which the panel wants
 * only while it shows the phone locked.
 */
const Query = z.strictObject({ view: z.enum(LOCK_VIEWERS), reward: z.literal("1").optional() });

const NO_STORE = { "Cache-Control": "no-store" };

/** The phone panel's state, decided on the server. The panel polls it every few seconds. */
export async function GET(request: Request): Promise<Response> {
  const parsed = Query.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!parsed.success) {
    return Response.json({ error: "invalid" }, { status: 400, headers: NO_STORE });
  }
  const { view, reward } = parsed.data;
  const studentId =
    view === "parent" ? (await parentViewer())?.studentId : await currentStudentId();
  if (!studentId) return Response.json({ error: "gate" }, { status: 401, headers: NO_STORE });
  const state = await lockView(studentId, new Date(), { reward: reward === "1" });
  return Response.json(state, { headers: NO_STORE });
}
