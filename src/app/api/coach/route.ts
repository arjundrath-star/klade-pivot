import { z } from "zod";
import { coachConfigured, streamCoachReply } from "@/coach/client";
import { createRedactingStream } from "@/coach/policy";
import { buildCoachPrompt, coachContext, COACH_MODEL, untrustedText } from "@/coach/prompt";
import { COACH_CALLS_PER_SESSION, hintLevel, type CoachError } from "@/coach/turns";
import { recordCoachTurn } from "@/db/queries/coach";
import { COACHED_BLOCK_IDS, problemKey } from "@/session/blocks";
import { currentStudentId } from "@/session/current-student";
import { openProblem } from "@/session/load";

const MAX_MESSAGE_LENGTH = 300;

const Body = z.object({
  sessionId: z.uuid(),
  block: z.enum(COACHED_BLOCK_IDS),
  index: z.int().nonnegative(),
  message: untrustedText(MAX_MESSAGE_LENGTH),
});

const STATUS: Readonly<Record<CoachError, number>> = {
  invalid: 400,
  "not-found": 404,
  closed: 409,
  "wrong-block": 409,
  solved: 409,
  exhausted: 409,
  "rate-limited": 429,
  unavailable: 503,
};

function reject(error: CoachError): Response {
  return Response.json({ error }, { status: STATUS[error] });
}

// Browsers send Sec-Fetch-Site on every request; a page on another origin cannot spend coach calls.
function sameOrigin(request: Request): boolean {
  const site = request.headers.get("sec-fetch-site");
  return site === null || site === "same-origin" || site === "none";
}

async function parseBody(request: Request): Promise<z.infer<typeof Body> | undefined> {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return undefined;
  }
  const parsed = Body.safeParse(json);
  return parsed.success ? parsed.data : undefined;
}

/**
 * One coach turn, streamed as plain text. The server decides the hint level from the turns it has
 * recorded, checks the session is the student's, open, and on a coached block, and filters the
 * reply before any of it reaches the browser.
 */
export async function POST(request: Request): Promise<Response> {
  if (!sameOrigin(request)) return reject("invalid");
  const body = await parseBody(request);
  if (!body) return reject("invalid");
  if (!coachConfigured()) return reject("unavailable");

  const studentId = await currentStudentId();
  const opened = await openProblem(body.sessionId, studentId, body.block, body.index);
  if (!opened.ok) return reject(opened.error);
  const { loaded, problem } = opened;
  if (loaded.coach.calls >= COACH_CALLS_PER_SESSION) return reject("rate-limited");
  const turns = loaded.coach.turns.get(problemKey(body.block, body.index)) ?? [];
  const level = hintLevel(turns.length);
  if (level === null) return reject("exhausted");

  const context = coachContext(problem, loaded.session.interests);
  const reply = streamCoachReply(
    buildCoachPrompt({
      lesson: loaded.content.learn,
      context,
      turns,
      student: body.message,
      level,
    }),
  );
  const filter = createRedactingStream(context.target);
  const encoder = new TextEncoder();

  // A browser that leaves mid-reply cancels the stream; the call still finishes and is logged.
  let open = true;
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let shown = "";
      const send = (text: string) => {
        if (text === "") return;
        shown += text;
        if (open) controller.enqueue(encoder.encode(text));
      };
      try {
        for await (const delta of reply.deltas) send(filter.push(delta));
        send(filter.flush());
        const usage = await reply.usage();
        // Saved before the stream closes, so a client that waits for the end can ask again.
        await recordCoachTurn(
          {
            sessionLogId: loaded.session.id,
            block: body.block,
            problemIndex: body.index,
            level,
            studentText: body.message,
            coachText: shown,
            redacted: filter.redacted(),
          },
          { kind: "coach", model: COACH_MODEL, sessionLogId: loaded.session.id, ...usage },
        );
        if (open) controller.close();
      } catch (error) {
        if (open) controller.error(error);
      }
    },
    cancel() {
      open = false;
    },
  });
  return new Response(stream, {
    headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" },
  });
}
