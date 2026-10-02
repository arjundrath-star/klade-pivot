"use client";

import { useEffect, useId, useRef, useState, type RefObject } from "react";
import { saveNotes } from "./actions";
import { inputClass } from "@/components/ui/field";
import { NOTES_MAX_LENGTH } from "@/session/notes";

type Status = "idle" | "unsaved" | "saving" | "saved" | "failed" | "closed";

const STATUS_TEXT: Readonly<Record<Status, string>> = {
  idle: "",
  unsaved: "Unsaved",
  saving: "Saving…",
  saved: "Saved",
  failed: "Not saved. Check your connection; your notes are still here.",
  closed: "This session is closed, so notes no longer save.",
};

// Saves this long after the last keystroke, and at once when the field loses focus.
const SAVE_AFTER_MS = 800;

interface NotesPanelProps {
  sessionId: string;
  initialNotes: string;
  /** Where the panel puts its save-now function, for the runner to await before a block move. */
  flushRef: RefObject<() => Promise<void>>;
}

/** The student's notes for this session: ruled paper that saves itself as they type. */
export function NotesPanel({ sessionId, initialNotes, flushRef }: NotesPanelProps) {
  const fieldId = useId();
  const [text, setText] = useState(initialNotes);
  const [status, setStatus] = useState<Status>("idle");
  // What the field holds, what the server has, and whether a save is on its way.
  const latest = useRef(initialNotes);
  const saved = useRef(initialNotes);
  const inFlight = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flush = async () => {
    if (inFlight.current || latest.current === saved.current) return;
    inFlight.current = true;
    const value = latest.current;
    setStatus("saving");
    const result = await saveNotes({ sessionId, notes: value });
    inFlight.current = false;
    if (!result.ok) {
      setStatus(result.error === "closed" ? "closed" : "failed");
      return;
    }
    saved.current = value;
    // Typing went on during the save: send what has arrived since.
    if (latest.current !== saved.current) void flush();
    else setStatus("saved");
  };

  // The runner awaits the latest flush before it moves on; leaving the page sends what is pending.
  useEffect(() => {
    flushRef.current = flush;
  });
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
      void flushRef.current();
      flushRef.current = async () => {};
    },
    [flushRef],
  );

  const schedule = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void flush(), SAVE_AFTER_MS);
  };

  const nearCap = text.length >= NOTES_MAX_LENGTH * 0.9;

  return (
    <div className="flex flex-col gap-2">
      {/* The tab above already reads "Notes"; the field's name is for assistive technology. */}
      <label htmlFor={fieldId} className="sr-only">
        Notes
      </label>
      <textarea
        id={fieldId}
        value={text}
        onChange={(event) => {
          const value = event.target.value;
          latest.current = value;
          setText(value);
          setStatus("unsaved");
          schedule();
        }}
        onBlur={() => {
          if (timer.current) clearTimeout(timer.current);
          void flush();
        }}
        maxLength={NOTES_MAX_LENGTH}
        rows={12}
        spellCheck={false}
        placeholder="Your working, your way. Only you see this."
        className={`${inputClass} paper-ruled min-h-72 w-full resize-y`}
      />
      <div className="flex min-h-5 items-baseline justify-between gap-3 text-sm text-ink-soft">
        <p role="status">{STATUS_TEXT[status]}</p>
        {nearCap && (
          <p className="tabular-nums">
            {text.length} of {NOTES_MAX_LENGTH}
          </p>
        )}
      </div>
    </div>
  );
}
