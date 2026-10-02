import type { ReactNode } from "react";

interface NoticeProps {
  /** `status` for the outcome of an action, `alert` for a problem that needs attention. */
  role: "status" | "alert";
  children: ReactNode;
}

/** The line a page shows after an action, or when something needs attention. */
export function Notice({ role, children }: NoticeProps) {
  const colors =
    role === "alert" ? "bg-alert-tint text-alert" : "bg-primary-tint text-primary-deep";
  return (
    <p role={role} className={`rounded-md px-4 py-3 text-sm font-medium ${colors}`}>
      {children}
    </p>
  );
}
