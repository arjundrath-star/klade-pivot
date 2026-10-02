"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ALWAYS_ALLOWED_APPS, AppGlyph, LOCKABLE_APPS } from "./apps";
import { openMessage } from "./messages";
import { streakLabel } from "@/parent/progress";
import type { LockViewer } from "@/session/lock";
import type { LockView } from "@/session/lock-status";

/** How often the panel asks the server for the lock state. */
const POLL_MS = 3000;
const TOAST_MS = 10_000;

type Toast = { kind: "session"; xp: number; streak: number } | { kind: "override" };

/** The banner an unlock shows: what the session earned, or the parent's unlock. */
function toastFor(next: LockView): Toast | null {
  if (next.reason === "session-done" && next.reward) return { kind: "session", ...next.reward };
  if (next.reason === "override") return { kind: "override" };
  return null;
}

/**
 * The lock state; with `reward`, what the session that unlocked the phone earned. Null when the
 * poll failed; "signed-out" when the gate no longer lets this browser read the parent's view.
 */
async function fetchLockView(
  viewer: LockViewer,
  reward: boolean,
): Promise<LockView | null | "signed-out"> {
  const query = `view=${viewer}${reward ? "&reward=1" : ""}`;
  const response = await fetch(`/api/lock-state?${query}`, { cache: "no-store" });
  if (response.status === 401) return "signed-out";
  return response.ok ? ((await response.json()) as LockView) : null;
}

interface PhonePanelProps {
  viewer: LockViewer;
  /** The state the page rendered with; the panel polls from there. */
  initial: LockView;
  /** Where "Open session" goes. */
  sessionHref: string;
}

/**
 * The mock phone's screen. It polls the lock state and, the moment the phone unlocks, drops a
 * banner with what the session earned. Prototype: it locks nothing outside this page.
 */
export function PhonePanel({ viewer, initial, sessionHref }: PhonePanelProps) {
  const [lock, setLock] = useState(initial);
  const [toast, setToast] = useState<Toast | null>(null);
  const last = useRef(initial);

  useEffect(() => {
    let live = true;
    let timer: ReturnType<typeof setTimeout>;
    // Each poll waits for the one before it, so a slow answer can never land after a newer one.
    const poll = async () => {
      if (!document.hidden) {
        // A failed poll leaves the last state on screen; the next one tries again. Once the
        // gate has closed on this browser, polling stops: a reload takes the parent to sign in.
        const next = await fetchLockView(viewer, last.current.locked).catch(() => null);
        if (!live || next === "signed-out") return;
        if (next) {
          if (last.current.locked && !next.locked) setToast(toastFor(next));
          if (next.locked) setToast(null);
          last.current = next;
          setLock(next);
        }
      }
      timer = setTimeout(poll, POLL_MS);
    };
    timer = setTimeout(poll, POLL_MS);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [viewer]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), TOAST_MS);
    return () => clearTimeout(timer);
  }, [toast]);

  const { locked } = lock;
  const categories = lock.rule?.categories ?? [];

  return (
    <div className="tone-night relative h-full overflow-hidden rounded-2xl">
      <div
        aria-hidden="true"
        className="bg-lock-glow absolute inset-0 transition-opacity duration-700 motion-reduce:transition-none"
        style={{ opacity: locked ? 1 : 0 }}
      />
      <div
        aria-hidden="true"
        className="bg-open-glow absolute inset-0 transition-opacity duration-700 motion-reduce:transition-none"
        style={{ opacity: locked ? 0 : 1 }}
      />

      <div className="relative flex h-full flex-col px-3.5 pt-2.5 pb-3">
        <div aria-hidden="true" className="mx-auto h-[22px] w-[84px] rounded-full bg-black" />

        <p className="mt-5 flex flex-col items-center">
          <span className="text-[13px] font-medium text-ink-soft">{lock.date}</span>
          <span className="font-display text-[58px] leading-none font-light tracking-tight tabular-nums">
            {lock.time}
          </span>
        </p>

        <ul aria-label="Apps" className="mt-6 grid grid-cols-4 gap-x-1 gap-y-3.5">
          {LOCKABLE_APPS.map((app, i) => {
            const off = locked && categories.includes(app.category);
            return (
              <li key={app.name} className="flex flex-col items-center gap-1">
                <span className="relative">
                  <span
                    className="grid size-[46px] place-items-center rounded-[0.85rem] transition-[filter,opacity] duration-500 motion-reduce:transition-none"
                    style={{
                      background: app.tile,
                      filter: off ? "grayscale(1)" : "none",
                      opacity: off ? 0.42 : 1,
                      transitionDelay: off ? "0ms" : `${i * 70}ms`,
                    }}
                  >
                    <AppGlyph name={app.glyph} className="size-6" />
                  </span>
                  {off && (
                    <span className="absolute -top-1.5 -right-1.5 grid size-5 place-items-center rounded-full bg-today text-ink ring-2 ring-night">
                      <AppGlyph name="lock" className="size-3" />
                    </span>
                  )}
                </span>
                <span className="text-[10.5px] text-white/90">
                  {app.name}
                  {off && <span className="sr-only">, locked</span>}
                </span>
              </li>
            );
          })}
        </ul>

        <div aria-live="polite" className="mt-auto">
          {locked ? (
            <div className="rounded-xl bg-white/12 p-3.5 ring-1 ring-white/15 backdrop-blur-md">
              <p className="flex items-start gap-2 text-[13px] leading-snug font-medium">
                <AppGlyph name="lock" className="mt-px size-4 shrink-0 text-today" />
                Locked. Finish today&apos;s 30-minute session to unlock.
              </p>
              <Link
                href={sessionHref}
                className="focus-ring mt-3 block rounded-full bg-today py-2 text-center text-[13px] font-semibold text-ink"
              >
                Open session
              </Link>
            </div>
          ) : (
            <p className="rounded-xl bg-white/12 px-3.5 py-3 text-[13px] leading-snug ring-1 ring-white/15">
              {openMessage(lock)}
            </p>
          )}

          {toast && (
            <div className="absolute inset-x-2 top-9 z-10 flex items-start gap-2.5 rounded-xl bg-white p-3 text-ink shadow-[0_12px_30px_-8px_rgba(0,0,0,0.45)] motion-safe:animate-phone-toast">
              <span className="grid size-8 shrink-0 place-items-center rounded-sm bg-open-high text-white">
                <AppGlyph name="open" className="size-[18px]" />
              </span>
              <p className="flex flex-col text-[12px] leading-snug">
                <span className="font-semibold">Unlocked</span>
                {toast.kind === "session" ? (
                  <span>
                    Session done. <strong>+{toast.xp} XP</strong>, {streakLabel(toast.streak)}.
                  </span>
                ) : (
                  <span>Opened by a parent for tonight.</span>
                )}
              </p>
            </div>
          )}
        </div>

        <ul
          aria-label="Always allowed"
          className="mt-3 grid grid-cols-4 justify-items-center rounded-xl bg-white/15 p-2 backdrop-blur-md"
        >
          {ALWAYS_ALLOWED_APPS.map((app) => (
            <li
              key={app.name}
              className="grid size-[46px] place-items-center rounded-[0.85rem]"
              style={{ background: app.tile }}
            >
              <AppGlyph name={app.glyph} className="size-6" />
              <span className="sr-only">{app.name}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
