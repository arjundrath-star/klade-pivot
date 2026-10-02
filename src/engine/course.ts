/**
 * Where a concept sits in a course and how far through it a student is. Pure: the course map, the
 * session breadcrumb, the dashboard figures and the seed all read these, given the course from
 * src/content and the keys of the concepts the student has mastered.
 */
import { unitMastered, type UnitOutline } from "@/engine/progress";

/** A concept on the course map. */
export interface CourseConceptOutline {
  key: string;
  title: string;
  /** The state standard codes the concept covers. */
  nys: readonly string[];
  /** The concept has a session a student can do today. */
  playable: boolean;
}

/** A unit of the course map. */
export interface CourseUnitOutline extends UnitOutline {
  title: string;
  /** What the unit is about, in one line. */
  summary?: string;
  concepts: readonly CourseConceptOutline[];
}

/** A concept with its place in course order: "concept 6 of 49", in unit 2. */
export interface CoursePlace {
  unit: CourseUnitOutline;
  concept: CourseConceptOutline;
  /** 1-based, across the whole course. */
  position: number;
  total: number;
}

// A course is a module constant, so its flattened form is built once per course.
const flattened = new WeakMap<readonly CourseUnitOutline[], readonly CoursePlace[]>();

/** Every concept in course order, each with its place. */
export function courseConcepts(units: readonly CourseUnitOutline[]): readonly CoursePlace[] {
  const cached = flattened.get(units);
  if (cached) return cached;
  const total = units.reduce((sum, unit) => sum + unit.concepts.length, 0);
  let position = 0;
  const places = units.flatMap((unit) =>
    unit.concepts.map((concept) => {
      position += 1;
      return { unit, concept, position, total };
    }),
  );
  flattened.set(units, places);
  return places;
}

/** The place of the concept with `key`, or undefined when the course has no such concept. */
export function conceptPlace(
  units: readonly CourseUnitOutline[],
  key: string,
): CoursePlace | undefined {
  return courseConcepts(units).find((place) => place.concept.key === key);
}

/** The keys of every concept before `key` in course order. */
export function conceptsBefore(units: readonly CourseUnitOutline[], key: string): string[] {
  const keys = courseConcepts(units).map((place) => place.concept.key);
  const at = keys.indexOf(key);
  if (at === -1) throw new Error(`The course has no concept "${key}"`);
  return keys.slice(0, at);
}

/**
 * The student's position: the first concept in course order not yet mastered, whether or not it
 * is playable. Undefined once every concept is mastered.
 */
export function nextConcept(
  units: readonly CourseUnitOutline[],
  mastered: ReadonlySet<string>,
): CoursePlace | undefined {
  return courseConcepts(units).find((place) => !mastered.has(place.concept.key));
}

export interface CourseProgress {
  /** Concepts mastered. */
  mastered: number;
  /** Concepts in the course. */
  total: number;
  /** Whole percent of concepts mastered. */
  percent: number;
  /** Units with every concept mastered. */
  unitsDone: number;
  units: number;
}

/** How far through the course the student is, by concepts and by units. */
export function courseProgress(
  units: readonly CourseUnitOutline[],
  mastered: ReadonlySet<string>,
): CourseProgress {
  const concepts = courseConcepts(units);
  const done = concepts.filter((place) => mastered.has(place.concept.key)).length;
  return {
    mastered: done,
    total: concepts.length,
    percent: concepts.length === 0 ? 0 : Math.round((done / concepts.length) * 100),
    unitsDone: units.filter((unit) => unitMastered(unit, mastered)).length,
    units: units.length,
  };
}

/** "AI-A.REI.3", or "AI-N.Q.1, AI-N.Q.3" for a concept that covers two standards. */
export function standardLabel(concept: Pick<CourseConceptOutline, "nys">): string {
  return concept.nys.join(", ");
}

export type NodeState = "mastered" | "current" | "upcoming";

/** How a concept renders on the map: done, today's, or not yet. */
export function nodeState(
  key: string,
  mastered: ReadonlySet<string>,
  currentKey: string | null,
): NodeState {
  if (mastered.has(key)) return "mastered";
  return key === currentKey ? "current" : "upcoming";
}
