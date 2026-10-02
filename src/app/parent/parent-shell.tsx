import type { ReactNode } from "react";
import { NoStudent } from "@/components/no-student";
import { AppShell, type NavItem } from "@/components/shell/app-shell";
import { ALGEBRA1_TITLE } from "@/content/algebra1/course";

const ITEMS = [
  { href: "/parent", label: "Overview", glyph: "overview", tint: "primary" },
  { href: "/parent/explanations", label: "Explanations", glyph: "explanations", tint: "course" },
  { href: "/parent/alerts", label: "Alerts", glyph: "alerts", tint: "today" },
  { href: "/parent/settings", label: "Phone rules", glyph: "phone", tint: "calendar" },
  { href: "/parent/mentor", label: "Mentor", glyph: "mentor", tint: "mentor" },
] as const satisfies readonly NavItem[];

type ParentPage = (typeof ITEMS)[number]["href"];

interface ParentShellProps<S extends { name: string }> {
  active: ParentPage;
  /** The student, or undefined when the family has none yet. */
  student: S | undefined;
  /** The page, given the student; without one the shell says so. */
  children: (student: S) => ReactNode;
}

/** The parent area's frame: the same shell as the student's, with the parent's pages. */
export function ParentShell<S extends { name: string }>({
  active,
  student,
  children,
}: ParentShellProps<S>) {
  return (
    <AppShell
      label="Parent"
      items={ITEMS}
      active={active}
      identity={{
        name: "Parent view",
        detail: student ? `${student.name}, ${ALGEBRA1_TITLE}` : "No student yet",
      }}
    >
      {student ? children(student) : <NoStudent />}
    </AppShell>
  );
}
