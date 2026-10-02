import type { ReactNode } from "react";
import { NoStudent } from "@/components/no-student";
import { AppShell, type NavItem } from "@/components/shell/app-shell";
import { ALGEBRA1_TITLE } from "@/content/algebra1/course";

const ITEMS = [
  { href: "/parent", label: "Overview", glyph: "overview" },
  { href: "/parent/explanations", label: "Explanations", glyph: "explanations" },
  { href: "/parent/alerts", label: "Alerts", glyph: "alerts" },
  { href: "/parent/settings", label: "Phone rule", glyph: "phone" },
  { href: "/parent/mentor", label: "Mentor", glyph: "mentor" },
] as const satisfies readonly NavItem[];

type ParentPage = (typeof ITEMS)[number]["href"];

interface ParentShellProps<S extends { name: string; parentName: string }> {
  active: ParentPage;
  /** The student with the parent's name from the family row, or undefined when there is none. */
  student: S | undefined;
  /** The page, given the student; without one the shell says so. */
  children: (student: S) => ReactNode;
}

/** The parent area's frame: the same shell as the student's, with the parent's pages. */
export function ParentShell<S extends { name: string; parentName: string }>({
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
        name: student?.parentName ?? "Parent",
        detail: student ? `${student.name}'s parent, ${ALGEBRA1_TITLE}` : "No student yet",
      }}
    >
      {student ? children(student) : <NoStudent />}
    </AppShell>
  );
}
