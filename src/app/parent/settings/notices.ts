/** What a settings action did, passed back to /parent/settings in the query string. */
export const SETTINGS_NOTICES = {
  saved: "Phone rule saved.",
  on: "Phone rule on.",
  off: "Phone rule off. Nothing locks until you turn it back on.",
  unlocked: "Unlocked until midnight. The rule is back tomorrow.",
  "no-rule": "Save a phone rule first.",
  "not-found": "There is no demo student. Run npm run db:seed.",
  invalid:
    "Pick at least one day, a start time and one kind of app. With weekends off, pick a weekday.",
} as const;

export type SettingsNotice = keyof typeof SETTINGS_NOTICES;

export const SETTINGS_NOTICE_KEYS = Object.keys(SETTINGS_NOTICES) as [
  SettingsNotice,
  ...SettingsNotice[],
];
