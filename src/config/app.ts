/** The product's name and one-line description, for the page metadata and the manifest. */
export const APP_NAME = "Foothold AI";

export const APP_DESCRIPTION =
  "Algebra 1 that makes the kid do the climbing: thirty-minute sessions on a schedule the parent sets, a coach that never gives the answer, and a record of what the kid can explain.";

/** The night of the design tokens (globals.css): the icon's ground and the installed app's chrome. */
export const THEME_COLOR = "#1b1838";

/** The tokens the alert email inlines, since email clients read no stylesheet: see globals.css. */
export const EMAIL_COLORS = {
  ink: THEME_COLOR,
  inkSoft: "#4b4868",
  line: "#e6e3ee",
  well: "#f6f5fb",
  primary: "#4a3fd1",
} as const;
