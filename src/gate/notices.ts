/** Why the gate sent the browser back to its form, passed in the query string. */
export const GATE_NOTICES = {
  wrong: "That password is not right.",
  wait: "Too many tries. Wait fifteen minutes and try again.",
  unset: "No admin password is set on this server, so the parent and admin views are closed.",
  invalid: "That request was not valid.",
} as const;

export type GateNotice = keyof typeof GATE_NOTICES;

export const GATE_NOTICE_KEYS = Object.keys(GATE_NOTICES) as [GateNotice, ...GateNotice[]];
