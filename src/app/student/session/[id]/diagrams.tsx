import { useId } from "react";
import type { ChapterDiagram } from "@/content/types";

// The chapter's pictures, drawn from the numbers the content gives. Ink lines and the course tint
// on white, like the rest of the page; every figure carries its meaning in a caption as well.

const LABEL = "fill-ink font-display text-[13px] font-semibold";
const SOFT = "fill-ink-soft text-[12px]";

function Figure({ caption, children }: { caption: string; children: React.ReactNode }) {
  return (
    <figure className="flex flex-col gap-2">
      <div className="rounded-md border border-line bg-white px-2 py-3">{children}</div>
      <figcaption className="text-sm text-ink-soft">{caption}</figcaption>
    </figure>
  );
}

/** Dots in rows: `count` of them, `perRow` across, from (`x`, `y`). */
function Dots({
  count,
  perRow,
  x,
  y,
  gap = 11,
}: {
  count: number;
  perRow: number;
  x: number;
  y: number;
  gap?: number;
}) {
  return Array.from({ length: count }, (_, i) => (
    <circle
      key={i}
      cx={x + (i % perRow) * gap}
      cy={y + Math.floor(i / perRow) * gap}
      r={4}
      className="fill-course"
    />
  ));
}

/** A balance scale: `a` bags of x and `b` weights on the left pan, `c` weights on the right. */
function Balance({ a, b, c }: { a: number; b: number; c: number }) {
  const id = useId();
  const caption = `Left pan: ${a} bags of x and ${b} weights. Right pan: ${c} weights. The scale is level, because the two sides are equal.`;
  return (
    <Figure caption={caption}>
      <svg
        viewBox="0 0 360 136"
        role="img"
        aria-labelledby={id}
        className="mx-auto w-full max-w-md"
      >
        <title id={id}>{caption}</title>
        <polygon points="180,60 168,126 192,126" className="fill-track" />
        <rect x="30" y="56" width="300" height="6" rx="3" className="fill-ink" />
        <path d="M80 62v38M280 62v38" className="stroke-ink" strokeWidth={2} />
        <rect x="24" y="100" width="112" height="6" rx="3" className="fill-ink" />
        <rect x="224" y="100" width="112" height="6" rx="3" className="fill-ink" />
        {Array.from({ length: a }, (_, i) => (
          <g key={i}>
            <rect
              x={30 + i * 26}
              y="76"
              width="22"
              height="22"
              rx="4"
              className="fill-course-tint stroke-course-deep"
              strokeWidth={1.5}
            />
            <text x={41 + i * 26} y="92" textAnchor="middle" className={LABEL}>
              x
            </text>
          </g>
        ))}
        <Dots count={b} perRow={3} x={34 + a * 26} y={79} />
        <Dots count={c} perRow={10} x={231} y={84} />
        <text x="80" y="126" textAnchor="middle" className={LABEL}>
          {a}x + {b}
        </text>
        <text x="280" y="126" textAnchor="middle" className={LABEL}>
          {c}
        </text>
      </svg>
    </Figure>
  );
}

/** A number line with one jump from `from` by `step`. */
function NumberLine({ from, step }: { from: number; step: number }) {
  const id = useId();
  const to = from + step;
  const lo = Math.min(from, to) - 1;
  const hi = Math.max(from, to) + 1;
  const ticks = Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);
  const x = (n: number) => 24 + ((n - lo) * 312) / (hi - lo);
  const forward = step >= 0;
  const caption = `Start at ${from}, jump ${Math.abs(step)} to the ${forward ? "right" : "left"}, and land on ${to}.`;
  return (
    <Figure caption={caption}>
      <svg viewBox="0 0 360 84" role="img" aria-labelledby={id} className="mx-auto w-full max-w-md">
        <title id={id}>{caption}</title>
        <path d={`M16 56H344`} className="stroke-ink" strokeWidth={2} />
        <polygon points="344,51 354,56 344,61" className="fill-ink" />
        {ticks.map((n) => (
          <g key={n}>
            <path d={`M${x(n)} 51v10`} className="stroke-ink" strokeWidth={1.5} />
            <text x={x(n)} y="76" textAnchor="middle" className={SOFT}>
              {n}
            </text>
          </g>
        ))}
        <path
          d={`M${x(from)} 50 Q${(x(from) + x(to)) / 2} 8 ${x(to)} 50`}
          className="fill-none stroke-course-deep"
          strokeWidth={2}
        />
        <polygon
          points={`${x(to) - 5},42 ${x(to)},52 ${x(to) + 5},42`}
          className="fill-course-deep"
        />
        <circle cx={x(from)} cy="56" r="5" className="fill-course" />
        <circle cx={x(to)} cy="56" r="5" className="fill-course" />
        <text x={(x(from) + x(to)) / 2} y="24" textAnchor="middle" className={LABEL}>
          {forward ? "+" : "-"} {Math.abs(step)}
        </text>
      </svg>
    </Figure>
  );
}

/** The build-up of ax + b from x on the way down, and the two undo moves back up to x. */
function UndoLadder({ a, b, x }: { a: number; b: number; x: number }) {
  const id = useId();
  const ax = a * x;
  const c = ax + b;
  const term = `${a}x`;
  // The constant as it is built in and as it is undone: added then subtracted, or the reverse.
  const plus = b >= 0;
  const size = Math.abs(b);
  const [build, undo] = plus ? ["+", "-"] : ["-", "+"];
  const expression = `${term} ${build} ${size}`;
  const rungs = [
    [`x = ${x}`, 28],
    [`${term} = ${ax}`, 72],
    [`${expression} = ${c}`, 116],
  ] as const;
  const caption = `Build up: start at x, multiply by ${a}, then ${plus ? "add" : "subtract"} ${size}. Undo: ${plus ? "subtract" : "add"} ${size}, then divide by ${a}, and x is alone again.`;
  return (
    <Figure caption={caption}>
      <svg
        viewBox="0 0 360 132"
        role="img"
        aria-labelledby={id}
        className="mx-auto w-full max-w-md"
      >
        <title id={id}>{caption}</title>
        <text x="60" y="14" textAnchor="middle" className={SOFT}>
          Build it up
        </text>
        <text x="300" y="14" textAnchor="middle" className={SOFT}>
          Undo it
        </text>
        {rungs.map(([label, y]) => (
          <g key={label}>
            <rect x="110" y={y - 14} width="140" height="28" rx="6" className="fill-course-tint" />
            <text x="180" y={y + 5} textAnchor="middle" className={LABEL}>
              {label}
            </text>
          </g>
        ))}
        <path d="M60 36v24M60 80v24" className="stroke-ink" strokeWidth={2} />
        <polygon points="55,58 60,66 65,58" className="fill-ink" />
        <polygon points="55,102 60,110 65,102" className="fill-ink" />
        <text x="70" y="52" className={LABEL}>
          × {a}
        </text>
        <text x="70" y="96" className={LABEL}>
          {build} {size}
        </text>
        <path d="M300 104V80M300 60V36" className="stroke-course-deep" strokeWidth={2} />
        <polygon points="295,82 300,74 305,82" className="fill-course-deep" />
        <polygon points="295,38 300,30 305,38" className="fill-course-deep" />
        <text x="262" y="96" textAnchor="end" className={LABEL}>
          {undo} {size}
        </text>
        <text x="262" y="52" textAnchor="end" className={LABEL}>
          ÷ {a}
        </text>
      </svg>
    </Figure>
  );
}

export function Diagram({ diagram }: { diagram: ChapterDiagram }) {
  switch (diagram.kind) {
    case "balance":
      return <Balance a={diagram.a} b={diagram.b} c={diagram.c} />;
    case "number-line":
      return <NumberLine from={diagram.from} step={diagram.step} />;
    case "undo-ladder":
      return <UndoLadder a={diagram.a} b={diagram.b} x={diagram.x} />;
  }
}
