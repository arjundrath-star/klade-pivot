import type { ReactNode } from "react";
import type { AdminControls } from "@/admin/controls";
import { AdminRibbon } from "@/admin/ribbon";
import { NoStudent } from "@/components/no-student";
import { AppShell, type NavItem } from "@/components/shell/app-shell";
import { ALGEBRA1_COURSE, ALGEBRA1_TITLE } from "@/content/algebra1/course";
import { level } from "@/engine/progress";

const ITEMS = [
  { href: "/student", label: "Today", glyph: "home" },
  { href: "/student/course", label: "Course", glyph: "course" },
  { href: "/student/calendar", label: "Calendar", glyph: "calendar" },
  { href: "/student/progress", label: "Progress", glyph: "progress" },
  { href: "/student/mentor", label: "Mentor", glyph: "mentor" },
] as const satisfies readonly NavItem[];

type StudentPage = (typeof ITEMS)[number]["href"];

interface StudentShellProps<S extends { name: string }> {
  active: StudentPage;
  /** The student, or undefined when the browser has none yet. */
  student: S | undefined;
  /** The concepts mastered, for the level in the sidebar. */
  mastered: ReadonlySet<string>;
  controls: AdminControls | null;
  /** The home page's `notice` query parameter, as a ribbon action left it. */
  notice?: string | string[];
  /** The page, given the student; without one the shell shows the way to set one up. */
  children: (student: S) => ReactNode;
}

/**
 * The student area's frame: the navigation, the student's name and level, the admin ribbon at the
 * top of every page, and the empty state when there is no student. The ribbon's actions come back
 * to the home page.
 */
export function StudentShell<S extends { name: string }>({
  active,
  student,
  mastered,
  controls,
  notice,
  children,
}: StudentShellProps<S>) {
  return (
    <AppShell
      label="Student"
      items={ITEMS}
      active={active}
      identity={{
        name: student?.name ?? "Student",
        detail: `${ALGEBRA1_TITLE}, Level ${level(ALGEBRA1_COURSE, mastered)}`,
      }}
    >
      <AdminRibbon controls={controls} back="/student" notice={notice} />
      {student ? children(student) : <NoStudent onboarding />}
    </AppShell>
  );
}
