"use client";

import { useEffect, useRef, type PointerEvent } from "react";
import { Button } from "@/components/ui/button";

type Point = { x: number; y: number };

type Pen = { color: string; width: number };

const LINE_WIDTH = 2.5;

/**
 * A drawing surface that takes mouse, touch and pen strokes, so the tablet mode can be tried
 * before the tablet app exists. Strokes live in this component alone: nothing is sent or saved.
 */
export function StylusPad() {
  const canvas = useRef<HTMLCanvasElement>(null);
  // Strokes as fractions of the surface, so they survive a resize and a redraw.
  const strokes = useRef<Point[][]>([]);
  const current = useRef<Point[] | null>(null);
  // The pen, read once per resize rather than on every pointer move.
  const pen = useRef<Pen>({ color: "", width: LINE_WIDTH });

  useEffect(() => {
    const element = canvas.current;
    if (!element) return;
    const observer = new ResizeObserver(() => {
      const scale = window.devicePixelRatio || 1;
      element.width = Math.round(element.clientWidth * scale);
      element.height = Math.round(element.clientHeight * scale);
      pen.current = { color: getComputedStyle(element).color, width: LINE_WIDTH * scale };
      redraw(element, strokes.current, pen.current);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const pointOf = (event: PointerEvent<HTMLCanvasElement>): Point => {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) / rect.width,
      y: (event.clientY - rect.top) / rect.height,
    };
  };

  // A tap is a stroke of one point, painted as a dot at once.
  const start = (event: PointerEvent<HTMLCanvasElement>) => {
    const element = event.currentTarget;
    element.setPointerCapture(event.pointerId);
    current.current = [pointOf(event)];
    strokes.current.push(current.current);
    const context = element.getContext("2d");
    if (context) drawStroke(context, element, current.current, pen.current);
  };

  const move = (event: PointerEvent<HTMLCanvasElement>) => {
    const stroke = current.current;
    if (!stroke) return;
    stroke.push(pointOf(event));
    const element = event.currentTarget;
    const context = element.getContext("2d");
    if (context) drawStroke(context, element, stroke.slice(-2), pen.current);
  };

  const end = () => {
    current.current = null;
  };

  const clear = () => {
    strokes.current = [];
    if (canvas.current) redraw(canvas.current, strokes.current, pen.current);
  };

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-ink-soft">
        Prototype: tablet writing arrives with the tablet app. Draw with a mouse, a finger or a pen;
        nothing here is saved.
      </p>
      <canvas
        ref={canvas}
        aria-label="Drawing surface"
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={end}
        onPointerCancel={end}
        className="paper-dotted aspect-[4/3] w-full cursor-crosshair touch-none rounded-sm border border-line-strong bg-white"
      />
      <Button variant="secondary" size="sm" onClick={clear} className="self-start">
        Clear the page
      </Button>
    </div>
  );
}

function redraw(element: HTMLCanvasElement, strokes: readonly Point[][], pen: Pen) {
  const context = element.getContext("2d");
  if (!context) return;
  context.clearRect(0, 0, element.width, element.height);
  for (const stroke of strokes) drawStroke(context, element, stroke, pen);
}

function drawStroke(
  context: CanvasRenderingContext2D,
  element: HTMLCanvasElement,
  stroke: Point[],
  pen: Pen,
) {
  if (stroke.length === 0) return;
  context.lineWidth = pen.width;
  context.lineCap = "round";
  context.lineJoin = "round";
  context.strokeStyle = pen.color;
  context.beginPath();
  stroke.forEach((point, i) => {
    const x = point.x * element.width;
    const y = point.y * element.height;
    if (i === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  });
  if (stroke.length === 1)
    context.lineTo(stroke[0].x * element.width, stroke[0].y * element.height);
  context.stroke();
}
