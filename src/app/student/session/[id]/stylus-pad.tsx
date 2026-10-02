"use client";

import { useEffect, useRef, type PointerEvent } from "react";
import { Button } from "@/components/ui/button";

type Point = { x: number; y: number };

type Pen = { color: string; width: number };

const LINE_WIDTH = 3;

/**
 * A drawing surface that takes mouse, touch and pen strokes, so the tablet mode can be tried
 * before the tablet app exists. Strokes live in this component alone: nothing is sent or saved.
 * Each stroke is drawn as curves through the midpoints between pointer samples, so a mouse writes
 * smooth figures instead of jagged polylines.
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

  // A tap is a stroke of one point, painted as a dot at once.
  const start = (event: PointerEvent<HTMLCanvasElement>) => {
    const element = event.currentTarget;
    element.setPointerCapture(event.pointerId);
    const stroke = [pointOf(element.getBoundingClientRect(), event)];
    current.current = stroke;
    strokes.current.push(stroke);
    const context = element.getContext("2d");
    if (context) drawStroke(context, element, stroke);
  };

  // Every sample the browser coalesced into this event, so fast strokes keep their shape, added
  // to the path as one piece.
  const move = (event: PointerEvent<HTMLCanvasElement>) => {
    const stroke = current.current;
    if (!stroke) return;
    const element = event.currentTarget;
    const context = element.getContext("2d");
    if (!context) return;
    const rect = element.getBoundingClientRect();
    const coalesced = event.nativeEvent.getCoalescedEvents?.() ?? [];
    const from = stroke.length;
    for (const sample of coalesced.length > 0 ? coalesced : [event]) {
      stroke.push(pointOf(rect, sample));
    }
    context.beginPath();
    traceCurve(context, scaled(element, stroke), from, stroke.length - 1);
    context.stroke();
  };

  // The last half segment, from the final midpoint to where the pointer lifted.
  const end = (event: PointerEvent<HTMLCanvasElement>) => {
    const stroke = current.current;
    current.current = null;
    const context = event.currentTarget.getContext("2d");
    if (!stroke || stroke.length < 2 || !context) return;
    const at = scaled(event.currentTarget, stroke);
    const last = stroke.length - 1;
    const from = pathEnd(at, last);
    context.beginPath();
    context.moveTo(from.x, from.y);
    context.lineTo(at(last).x, at(last).y);
    context.stroke();
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
        className="paper-dotted aspect-[4/3] min-h-80 w-full cursor-crosshair touch-none rounded-sm border border-line-strong bg-white"
      />
      <Button variant="secondary" size="sm" onClick={clear} className="self-start">
        Clear the page
      </Button>
    </div>
  );
}

function pointOf(rect: DOMRect, event: { clientX: number; clientY: number }): Point {
  return {
    x: (event.clientX - rect.left) / rect.width,
    y: (event.clientY - rect.top) / rect.height,
  };
}

/** The stroke's samples in canvas pixels, by index. */
function scaled(element: HTMLCanvasElement, stroke: readonly Point[]): (i: number) => Point {
  return (i) => ({ x: stroke[i].x * element.width, y: stroke[i].y * element.height });
}

function midpoint(a: Point, b: Point): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

/** Where the smoothed path stands once sample `i` is in: the first sample, then each midpoint. */
function pathEnd(at: (i: number) => Point, i: number): Point {
  return i === 0 ? at(0) : midpoint(at(i - 1), at(i));
}

/**
 * Adds the smoothed path from sample `from` (1 or more) to sample `to`: a line to the first
 * midpoint, then a curve through each sample to the next midpoint. Drawing it piece by piece as
 * samples arrive paints exactly what a redraw of the whole stroke paints.
 */
function traceCurve(
  context: CanvasRenderingContext2D,
  at: (i: number) => Point,
  from: number,
  to: number,
) {
  const start = pathEnd(at, from - 1);
  context.moveTo(start.x, start.y);
  for (let i = from; i <= to; i += 1) {
    const end = pathEnd(at, i);
    if (i === 1) context.lineTo(end.x, end.y);
    else context.quadraticCurveTo(at(i - 1).x, at(i - 1).y, end.x, end.y);
  }
}

function setPen(context: CanvasRenderingContext2D, pen: Pen) {
  context.lineWidth = pen.width;
  context.lineCap = "round";
  context.lineJoin = "round";
  context.strokeStyle = pen.color;
}

// Resizing the canvas resets its context, so the pen is set here and holds until the next resize.
function redraw(element: HTMLCanvasElement, strokes: readonly Point[][], pen: Pen) {
  const context = element.getContext("2d");
  if (!context) return;
  context.clearRect(0, 0, element.width, element.height);
  setPen(context, pen);
  for (const stroke of strokes) drawStroke(context, element, stroke);
}

/** A whole stroke: the smoothed path and its last half segment, or a dot for a single point. */
function drawStroke(
  context: CanvasRenderingContext2D,
  element: HTMLCanvasElement,
  stroke: readonly Point[],
) {
  if (stroke.length === 0) return;
  const at = scaled(element, stroke);
  const last = stroke.length - 1;
  context.beginPath();
  traceCurve(context, at, 1, last);
  context.lineTo(at(last).x, at(last).y);
  context.stroke();
}
