interface Step {
  label: string;
  /** The equation after the step. */
  equation: string;
  reason?: string;
}

interface StepListProps {
  label: string;
  steps: readonly Step[];
  /** Announce steps as they appear. */
  live?: boolean;
}

/** The steps of one solution, the same way everywhere the student sees them. */
export function StepList({ label, steps, live = false }: StepListProps) {
  return (
    <ol aria-label={label} aria-live={live ? "polite" : undefined} className="flex flex-col gap-4">
      {steps.map((step, i) => (
        <li
          key={step.label}
          className="flex flex-col gap-1 border-l-2 border-zinc-300 pl-4 dark:border-zinc-700"
        >
          <p className="text-sm font-semibold">
            Step {i + 1}. {step.label}
          </p>
          <p className="font-mono text-lg">{step.equation}</p>
          {step.reason && <p className="text-zinc-600 dark:text-zinc-400">{step.reason}</p>}
        </li>
      ))}
    </ol>
  );
}
