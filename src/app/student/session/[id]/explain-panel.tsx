"use client";

import { useEffect, useId, useRef, useState, useSyncExternalStore, useTransition } from "react";
import { useRouter } from "next/navigation";
import { submitExplanation } from "./actions";
import { useProgress } from "./session-runner";
import {
  CRITERIA,
  CRITERION_LABELS,
  EXPLAIN_ATTEMPTS,
  MAX_CRITERION_SCORE,
  MAX_TOTAL_SCORE,
  MAX_EXPLANATION_LENGTH,
  totalScore,
  type ExplainError,
  type ExplainResult,
} from "@/coach/rubric";

// The Web Speech API is not in TypeScript's DOM types, and Chrome only ships it prefixed. These
// are the parts the panel uses.
interface RecognitionEvent {
  resultIndex: number;
  results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }>;
}

interface Recognizer {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: RecognitionEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

type RecognizerConstructor = new () => Recognizer;

function speechRecognition(): RecognizerConstructor | undefined {
  const speech = window as unknown as {
    SpeechRecognition?: RecognizerConstructor;
    webkitSpeechRecognition?: RecognizerConstructor;
  };
  return speech.SpeechRecognition ?? speech.webkitSpeechRecognition;
}

const subscribeNever = () => () => {};

/** Whether this browser can transcribe speech. False on the server and where the API is missing. */
function useSpeechSupported(): boolean {
  return useSyncExternalStore(
    subscribeNever,
    () => speechRecognition() !== undefined,
    () => false,
  );
}

function appendTranscript(text: string, transcript: string): string {
  const base = text.trimEnd();
  return (base === "" ? transcript : `${base} ${transcript}`).slice(0, MAX_EXPLANATION_LENGTH);
}

// null: the session moved on elsewhere, so the page reloads from the server instead.
const ERROR_MESSAGES: Readonly<Record<ExplainError, string | null>> = {
  invalid: "Write or say your explanation first.",
  unavailable:
    "Grading unavailable right now. Your explanation is still here, so try again in a minute.",
  "rate-limited": "Grading is paused for this session. Let a parent know.",
  closed: null,
  "wrong-block": null,
  graded: null,
};

interface ExplainPanelProps {
  sessionId: string;
  /** Attempts already graded, first attempt first. */
  initialResults: readonly ExplainResult[];
}

/** Block 4: the student explains why each step works, by voice or typing, and gets graded. */
export function ExplainPanel({ sessionId, initialResults }: ExplainPanelProps) {
  const router = useRouter();
  const { explainBack, setExplainBack } = useProgress();
  const [results, setResults] = useState(initialResults);
  const [retrying, setRetrying] = useState(false);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const fieldId = useId();
  const hintId = useId();

  // Integrity signals for the current attempt. Stored for the parent, never shown here.
  const signals = useRef({ startedAt: null as number | null, pasted: false, voice: false });
  const markStarted = () => {
    signals.current.startedAt ??= Date.now();
  };

  const speechSupported = useSpeechSupported();
  const recognizer = useRef<Recognizer | null>(null);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [micError, setMicError] = useState<string | null>(null);
  useEffect(() => () => recognizer.current?.abort(), []);

  const showForm = explainBack === "pending" || retrying;

  const startListening = () => {
    const Recognition = speechRecognition();
    if (!Recognition) return;
    const recognition = new Recognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognition.onresult = (event) => {
      let spoken = "";
      let partial = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        const transcript = result[0]?.transcript.trim() ?? "";
        if (result.isFinal) spoken = `${spoken} ${transcript}`;
        else partial = `${partial} ${transcript}`;
      }
      spoken = spoken.trim();
      if (spoken !== "") {
        markStarted();
        signals.current.voice = true;
        setDraft((text) => appendTranscript(text, spoken));
      }
      setInterim(partial.trim());
    };
    recognition.onerror = (event) => {
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        setMicError("The microphone is blocked. You can type instead.");
      }
    };
    recognition.onend = () => {
      recognizer.current = null;
      setListening(false);
      setInterim("");
    };
    recognizer.current = recognition;
    setMicError(null);
    recognition.start();
    setListening(true);
  };

  const stopListening = () => recognizer.current?.stop();

  const submit = () => {
    const text = draft.trim();
    if (text === "") {
      setError(ERROR_MESSAGES.invalid);
      return;
    }
    setError(null);
    const { startedAt, pasted, voice } = signals.current;
    startTransition(async () => {
      const response = await submitExplanation({
        sessionId,
        text,
        source: voice ? "voice" : "typed",
        pasted,
        durationMs: startedAt === null ? 0 : Date.now() - startedAt,
      });
      if (!response.ok) {
        const message = ERROR_MESSAGES[response.error];
        if (message === null) router.refresh();
        else setError(message);
        return;
      }
      setResults((prev) => [...prev, response.result]);
      setExplainBack(response.status);
      setRetrying(false);
    });
  };

  // A fresh field, so the retry's signals measure a new explanation, not an edit of the old one.
  const tryAgain = () => {
    signals.current = { startedAt: null, pasted: false, voice: false };
    setDraft("");
    setRetrying(true);
  };

  return (
    <div className="flex flex-col gap-6">
      {results.map((result) => (
        <ResultCard key={result.attempt} result={result} />
      ))}

      {explainBack === "retry" && !retrying && (
        <div className="flex flex-col items-start gap-2">
          <p>You need one more try. Use the feedback above and explain it again.</p>
          <button type="button" onClick={tryAgain} className="btn-primary">
            Try once more
          </button>
        </div>
      )}

      {showForm && (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
          className="flex flex-col gap-3"
        >
          <label htmlFor={fieldId} className="font-medium">
            Explain why each step works
          </label>
          <p id={hintId} className="text-sm text-zinc-600 dark:text-zinc-400">
            Walk through your solution. For each step, say what you did and why it is allowed.
            {speechSupported && " You can speak or type."}
          </p>
          <textarea
            id={fieldId}
            aria-describedby={hintId}
            value={draft}
            onChange={(event) => {
              markStarted();
              setDraft(event.target.value);
            }}
            onPaste={() => {
              markStarted();
              signals.current.pasted = true;
            }}
            maxLength={MAX_EXPLANATION_LENGTH}
            rows={6}
            className="rounded-md border border-zinc-300 px-3 py-2 leading-relaxed dark:border-zinc-700 dark:bg-zinc-900"
          />
          {listening && (
            <p aria-live="polite" className="min-h-5 text-sm text-zinc-600 dark:text-zinc-400">
              Listening… {interim}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-3">
            {/* Chrome delivers the last words after stop(), so the student stops before submitting. */}
            <button type="submit" disabled={pending || listening} className="btn-primary">
              {pending ? "Grading…" : "Submit"}
            </button>
            {speechSupported && (
              <button
                type="button"
                aria-pressed={listening}
                onClick={listening ? stopListening : startListening}
                disabled={pending}
                className="btn-secondary"
              >
                {listening ? "Stop speaking" : "Speak"}
              </button>
            )}
            <span className="text-sm text-zinc-600 dark:text-zinc-400">
              {draft.length} / {MAX_EXPLANATION_LENGTH}
            </span>
          </div>
          <p role="status" className="min-h-5 text-sm text-zinc-600 dark:text-zinc-400">
            {pending ? "Grading your explanation…" : micError}
          </p>
          {error && (
            <p role="alert" className="text-sm font-medium text-red-700 dark:text-red-400">
              {error}
            </p>
          )}
        </form>
      )}
    </div>
  );
}

function verdictText({ verdict, attempt }: ExplainResult): string {
  if (verdict === "pass") return "Passed.";
  return attempt < EXPLAIN_ATTEMPTS ? "Not yet." : "This result stands. The exit check is next.";
}

function ResultCard({ result }: { result: ExplainResult }) {
  const passed = result.verdict === "pass";
  return (
    <section
      aria-label={`Attempt ${result.attempt} result`}
      className="flex flex-col gap-3 rounded-lg border border-zinc-200 p-5 dark:border-zinc-800"
    >
      <p
        className={`font-semibold ${passed ? "text-emerald-700 dark:text-emerald-400" : "text-red-700 dark:text-red-400"}`}
      >
        Score {totalScore(result.scores)} of {MAX_TOTAL_SCORE}. {verdictText(result)}
      </p>
      <dl className="grid grid-cols-3 gap-2 text-sm">
        {CRITERIA.map((criterion) => (
          <div key={criterion} className="flex flex-col">
            <dt className="text-zinc-600 dark:text-zinc-400">{CRITERION_LABELS[criterion]}</dt>
            <dd className="font-mono">
              {result.scores[criterion]} / {MAX_CRITERION_SCORE}
            </dd>
          </div>
        ))}
      </dl>
      <p className="leading-relaxed">{result.feedback}</p>
    </section>
  );
}
