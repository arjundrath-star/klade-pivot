/**
 * The system's tints: the primary accent and one per feature. Each has a soft background, a fill
 * and a deep text color (globals.css). Written out in full so Tailwind emits every class.
 */
export type Tint = "primary" | "today" | "course" | "calendar" | "progress" | "mentor";

/** The soft background. */
export const TINT_BG: Readonly<Record<Tint, string>> = {
  primary: "bg-primary-tint",
  today: "bg-today-tint",
  course: "bg-course-tint",
  calendar: "bg-calendar-tint",
  progress: "bg-progress-tint",
  mentor: "bg-mentor-tint",
};

/** The deep text color, readable on white and on the tint. */
export const TINT_TEXT: Readonly<Record<Tint, string>> = {
  primary: "text-primary-deep",
  today: "text-today-deep",
  course: "text-course-deep",
  calendar: "text-calendar-deep",
  progress: "text-progress-deep",
  mentor: "text-mentor-deep",
};

/** The fill alone, for bars and marks. */
export const TINT_BAR: Readonly<Record<Tint, string>> = {
  primary: "bg-primary",
  today: "bg-today",
  course: "bg-course",
  calendar: "bg-calendar",
  progress: "bg-progress",
  mentor: "bg-mentor",
};

/** A hairline in the fill color, for the edge of a tinted card. */
export const TINT_BORDER: Readonly<Record<Tint, string>> = {
  primary: "border-primary/30",
  today: "border-today/50",
  course: "border-course/40",
  calendar: "border-calendar/40",
  progress: "border-progress/35",
  mentor: "border-mentor/60",
};
