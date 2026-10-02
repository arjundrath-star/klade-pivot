import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import {
  hintLevel,
  isCoachError,
  openingMessage,
  type CoachError,
  type CoachTurn,
} from "@/coach/turns";
import type { AnsweredBlockId } from "@/session/blocks";
import { RELOAD_MESSAGE } from "./session-runner";

const OFFLINE = "Your coach is offline right now. Look back at the lesson and keep trying.";
const LIMIT =
  "You've used all the coaching for this session. Look back at the lesson and keep trying.";
const FAILED = "Your coach didn't answer. Try again in a moment.";
const CUT_OFF = "Your coach got cut off. What you see is all it said.";

// null: the session moved on in another tab, so the page reloads it from the server.
const MESSAGES: Readonly<Record<CoachError, string | null>> = {
  invalid: RELOAD_MESSAGE,
  unavailable: OFFLINE,
  "rate-limited": LIMIT,
  "not-found": null,
  closed: null,
  "wrong-block": null,
  solved: RELOAD_MESSAGE,
  skipped: RELOAD_MESSAGE,
  exhausted: RELOAD_MESSAGE,
};

async function errorCode(response: Response): Promise<CoachError | null> {
  try {
    const data: unknown = await response.json();
    if (typeof data === "object" && data !== null && "error" in data && isCoachError(data.error)) {
      return data.error;
    }
  } catch {
    // Not JSON: a proxy or the framework answered instead of the route.
  }
  return null;
}

export interface CoachState {
  /** The coach has something to show: saved turns, or a request just made. */
  started: boolean;
  turns: readonly CoachTurn[];
  /** The turn being streamed, or one that was cut off and is kept on screen with its error. */
  live: CoachTurn | null;
  /** A request is in flight. */
  busy: boolean;
  error: string | null;
  /** Every hint is used; the panel shows the worked example instead. */
  exhausted: boolean;
  /** Opens with the student's wrong answer, or "I'm stuck" when there is none. */
  askForHelp: (wrongAnswer: string | null) => void;
  reply: (message: string) => void;
}

/** The coach conversation for one problem: what was said, what is streaming, what went wrong. */
export function useCoach(
  sessionId: string,
  block: AnsweredBlockId,
  index: number,
  initialTurns: readonly CoachTurn[],
  available = true,
): CoachState {
  const router = useRouter();
  const [turns, setTurns] = useState(initialTurns);
  const [live, setLive] = useState<CoachTurn | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [asked, setAsked] = useState(false);
  const inFlight = useRef(false);
  const level = hintLevel(turns.length);

  const ask = async (message: string) => {
    if (inFlight.current || level === null) return;
    setAsked(true);
    // The server said at render time that it has no model key: say so without a request.
    if (!available) {
      setError(OFFLINE);
      return;
    }
    inFlight.current = true;
    setBusy(true);
    setError(null);
    setLive({ level, student: message, coach: "" });
    let coach = "";
    try {
      const response = await fetch("/api/coach", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sessionId, block, index, message }),
      });
      if (!response.ok || response.body === null) {
        const code = await errorCode(response);
        const shown = code === null ? FAILED : MESSAGES[code];
        setLive(null);
        if (shown === null) router.refresh();
        else setError(shown);
        return;
      }
      const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        coach += value;
        setLive({ level, student: message, coach });
      }
      setTurns((prev) => [...prev, { level, student: message, coach }]);
      setLive(null);
    } catch {
      // A reply that was cut off stays on screen; the next request replaces it.
      if (coach === "") setLive(null);
      setError(coach === "" ? FAILED : CUT_OFF);
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };

  return {
    started: asked || turns.length > 0,
    turns,
    live,
    busy,
    error,
    exhausted: level === null,
    askForHelp: (wrongAnswer) => void ask(openingMessage(wrongAnswer)),
    reply: (message) => void ask(message),
  };
}
