import { TINT_BAR, type Tint } from "./tints";

type ProgressTone = Tint | "success";

/** Tracks up to this long draw one segment per step; longer ones draw a plain bar. */
const MAX_SEGMENTS = 8;

interface ProgressBarProps {
  label: string;
  value: number;
  max: number;
  /** What a screen reader says instead of the number. */
  valueText?: string;
  tone?: ProgressTone;
  /** One segment per step when the track is short enough to count. */
  segmented?: boolean;
  /** The bar's height; `thin` for a bar under a heading. */
  size?: "md" | "thin";
}

/** A progress bar in the system's track and a feature's fill. */
export function ProgressBar({
  label,
  value,
  max,
  valueText,
  tone = "primary",
  segmented = false,
  size = "md",
}: ProgressBarProps) {
  const fill = tone === "success" ? "bg-success-fill" : TINT_BAR[tone];
  const height = size === "thin" ? "h-1.5" : "h-2.5";
  const bar = {
    role: "progressbar",
    "aria-label": label,
    "aria-valuemin": 0,
    "aria-valuemax": max,
    "aria-valuenow": value,
    "aria-valuetext": valueText,
  } as const;
  if (segmented && max <= MAX_SEGMENTS) {
    return (
      <div {...bar} className="flex gap-1.5">
        {Array.from({ length: max }, (_, step) => (
          <span
            key={step}
            className={`${height} flex-1 rounded-full ${step < value ? fill : "bg-track"}`}
          />
        ))}
      </div>
    );
  }
  return (
    <div {...bar} className={`${height} overflow-hidden rounded-full bg-track`}>
      <div
        className={`h-full rounded-full ${fill}`}
        style={{ width: `${max === 0 ? 0 : Math.min(100, (value / max) * 100)}%` }}
      />
    </div>
  );
}
