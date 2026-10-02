import { Equation } from "./equation";

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
        <li key={step.label} className="flex flex-col gap-1 border-l-2 border-primary/40 pl-4">
          <p className="text-sm font-semibold text-primary-deep">
            Step {i + 1}. {step.label}
          </p>
          <Equation size="lg">{step.equation}</Equation>
          {step.reason && <p className="text-ink-soft">{step.reason}</p>}
        </li>
      ))}
    </ol>
  );
}
