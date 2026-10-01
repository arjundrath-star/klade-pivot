"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ALWAYS_ALLOWED_APPS, AppGlyph, LOCKABLE_APPS } from "./apps";
import { timeLabel } from "@/parent/phone-rule";
import { streakLabel } from "@/parent/progress";
import type { LockViewer } from "@/session/lock";
import type { LockView } from "@/session/lock-status";

/** How often the panel asks the server for the lock state. */
const POLL_MS = 3000;
const TOAST_MS = 10_000;

const DUSK = "#1B1838";
const AMBER = "#F2B33D";

type Toast = { kind: "session"; xp: number; streak: number } | { kind: "override" };

/** The banner an unlock shows: what the session earned, or the parent's unlock. */
function toastFor(next: LockView): Toast | null {
  if (next.reason === "session-done" && next.reward) return { kind: "session", ...next.reward };
  if (next.reason === "override") return { kind: "override" };
  return null;
}

/** What the screen says while the phone is open. */
function openMessage({ reason, rule }: LockView): string {
  switch (reason) {
    case "session-done":
      return "Today's session is done. Everything is open.";
    case "override":
      return "A parent unlocked this phone until midnight.";
    case "before-start":
      return `Apps lock at ${rule ? timeLabel(rule.startTime) : "the start time"} until today's session is done.`;
    case "not-session-day":
      return "No session today. Everything is open.";
    case "weekend-off":
      return "It's the weekend. Everything is open.";
    case "off":
      return "The phone rule is off.";
    default:
      return "No phone rule yet.";
  }
}

/** The lock state; with `reward`, what the session that unlocked the phone earned. */
async function fetchLockView(viewer: LockViewer, reward: boolean): Promise<LockView | null> {
  const query = `view=${viewer}${reward ? "&reward=1" : ""}`;
  const response = await fetch(`/api/lock-state?${query}`, { cache: "no-store" });
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
        // A failed poll leaves the last state on screen; the next one tries again.
        const next = await fetchLockView(viewer, last.current.locked).catch(() => null);
        if (!live) return;
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
    <div className="relative h-full overflow-hidden rounded-[2.1rem] text-white">
      <div
        aria-hidden="true"
        className="absolute inset-0 transition-opacity duration-700 motion-reduce:transition-none"
        style={{
          opacity: locked ? 1 : 0,
          background: `radial-gradient(120% 55% at 50% 108%, rgba(242,179,61,0.5), transparent 70%), linear-gradient(170deg, #2B2660 0%, ${DUSK} 62%)`,
        }}
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 transition-opacity duration-700 motion-reduce:transition-none"
        style={{
          opacity: locked ? 0 : 1,
          background:
            "radial-gradient(120% 55% at 50% 108%, rgba(134,239,198,0.45), transparent 70%), linear-gradient(170deg, #11605B 0%, #0B3B39 62%)",
        }}
      />

      <div className="relative flex h-full flex-col px-3.5 pt-2.5 pb-3">
        <div aria-hidden="true" className="mx-auto h-[22px] w-[84px] rounded-full bg-black" />

        <p className="mt-5 flex flex-col items-center">
          <span className="text-[13px] font-medium text-white/85">{lock.date}</span>
          <span className="text-[58px] leading-none font-extralight tracking-tight tabular-nums">
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
                    <span
                      className="absolute -top-1.5 -right-1.5 grid size-5 place-items-center rounded-full"
                      style={{ background: AMBER, color: DUSK, boxShadow: `0 0 0 2px ${DUSK}` }}
                    >
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
            <div className="rounded-2xl bg-white/12 p-3.5 ring-1 ring-white/15 backdrop-blur-md">
              <p className="flex items-start gap-2 text-[13px] leading-snug font-medium">
                <AppGlyph name="lock" className="mt-px size-4 shrink-0 text-[#F2B33D]" />
                Locked. Finish today&apos;s 30-minute session to unlock.
              </p>
              <Link
                href={sessionHref}
                className="mt-3 block rounded-full py-2 text-center text-[13px] font-semibold outline-offset-2 focus-visible:outline-2 focus-visible:outline-white"
                style={{ background: AMBER, color: DUSK }}
              >
                Open session
              </Link>
            </div>
          ) : (
            <p className="rounded-2xl bg-white/12 px-3.5 py-3 text-[13px] leading-snug ring-1 ring-white/15">
              {openMessage(lock)}
            </p>
          )}

          {toast && (
            <div className="absolute inset-x-2 top-9 z-10 flex items-start gap-2.5 rounded-2xl bg-white p-3 text-[#16213A] shadow-[0_12px_30px_-8px_rgba(0,0,0,0.45)] motion-safe:animate-[phone-toast_480ms_cubic-bezier(0.2,0.9,0.3,1.15)]">
              <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[#0E4D4A] text-white">
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
          className="mt-3 grid grid-cols-4 justify-items-center rounded-[1.6rem] bg-white/15 p-2 backdrop-blur-md"
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
