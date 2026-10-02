import type { ComponentPropsWithoutRef, ReactNode } from "react";

/** Text inputs, selects and textareas. */
export const inputClass =
  "focus-ring rounded-sm border border-line-strong bg-white px-3.5 py-2.5 text-base text-ink placeholder:text-ink-faint disabled:opacity-50";

interface FieldProps {
  /** The control's id, which the label points at. */
  id: string;
  label: ReactNode;
  /** A line under the control. Give the control `aria-describedby` of `${id}-hint`. */
  hint?: ReactNode;
  /** The hint reads as a problem with the value. */
  invalid?: boolean;
  children: ReactNode;
}

/** A labeled control with its hint, laid out the same way in every form. */
export function Field({ id, label, hint, invalid = false, children }: FieldProps) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="font-medium">
        {label}
      </label>
      {children}
      {hint && (
        <p id={`${id}-hint`} className={`text-sm ${invalid ? "text-alert" : "text-ink-soft"}`}>
          {hint}
        </p>
      )}
    </div>
  );
}

/** A legend and its hint above a group of choices. */
export function Legend({
  id,
  children,
  hint,
}: {
  id?: string;
  children: ReactNode;
  hint?: ReactNode;
}) {
  return (
    <>
      <legend className="mb-2 font-medium">{children}</legend>
      {hint && (
        <p id={id} className="mb-3 text-sm text-ink-soft">
          {hint}
        </p>
      )}
    </>
  );
}

/**
 * A choice tile: a label around a checkbox or a radio, outlined in ink once it is picked and
 * faded while it cannot be.
 */
export function Choice({ className = "", ...props }: ComponentPropsWithoutRef<"label">) {
  return (
    <label
      className={`flex items-start gap-3 rounded-md border border-line bg-white px-3.5 py-3 transition-colors hover:border-line-strong has-checked:border-primary has-checked:bg-primary-tint has-disabled:opacity-50 has-disabled:hover:border-line ${className}`}
      {...props}
    />
  );
}
