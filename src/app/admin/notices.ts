/** What an admin action did, passed back to `/admin` in the query string after the redirect. */
export const ADMIN_NOTICES = {
  missed: "Today's session is marked missed and the alert is on the parent view.",
  "done-today": "Today's session is already done, so it cannot be missed.",
  "open-today": "Today's session is open and can still be finished, so it is not missed.",
  "already-missed": "Today's session is already marked missed.",
  "not-found": "There is no demo student. Run npm run db:seed.",
  interest: "Interest switched. The next word problem uses it.",
  override: "Explain-back passed by override. The student can go on to the exit check.",
  "no-session": "No session is open.",
  "wrong-block": "The open session is not on explain-back.",
  graded: "This session's explain-back is already final.",
  clock:
    "Demo clock set. The phone panel locks until today's session is done or a parent unlocks it.",
  "clock-done":
    "Demo clock set, but today's session is already done, so the phone stays open. Run npm run db:reset to rehearse the lock again.",
  reset: "Demo reset. The phone follows the real clock and tonight's unlock is gone.",
  invalid: "That request was not valid.",
} as const;

export type AdminNotice = keyof typeof ADMIN_NOTICES;

export const NOTICE_KEYS = Object.keys(ADMIN_NOTICES) as [AdminNotice, ...AdminNotice[]];
