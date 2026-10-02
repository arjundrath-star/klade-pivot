import { describe, expect, it } from "vitest";
import {
  conceptPlace,
  conceptsBefore,
  courseConcepts,
  courseProgress,
  nextConcept,
  nodeState,
  standardLabel,
  type CourseUnitOutline,
} from "@/engine/course";

const concept = (key: string, nys: string[] = [`AI-${key}`]) => ({
  key,
  title: key,
  nys,
  playable: key === "b",
});

const COURSE: CourseUnitOutline[] = [
  { number: 1, title: "One", concepts: [concept("a"), concept("b")] },
  { number: 2, title: "Two", concepts: [concept("c", ["AI-X.1", "AI-X.2"]), concept("d")] },
  { number: 3, title: "Three", concepts: [concept("e")] },
];

describe("course positions", () => {
  it("numbers every concept across the whole course", () => {
    expect(courseConcepts(COURSE).map((p) => [p.concept.key, p.position, p.total])).toEqual([
      ["a", 1, 5],
      ["b", 2, 5],
      ["c", 3, 5],
      ["d", 4, 5],
      ["e", 5, 5],
    ]);
    expect(conceptPlace(COURSE, "d")).toMatchObject({ position: 4, unit: { number: 2 } });
    expect(conceptPlace(COURSE, "zzz")).toBeUndefined();
  });

  it("lists the concepts before one, and refuses an unknown one", () => {
    expect(conceptsBefore(COURSE, "a")).toEqual([]);
    expect(conceptsBefore(COURSE, "d")).toEqual(["a", "b", "c"]);
    expect(() => conceptsBefore(COURSE, "zzz")).toThrow(/no concept "zzz"/);
  });

  it("puts the student at the first concept not mastered, built or not", () => {
    expect(nextConcept(COURSE, new Set())?.concept.key).toBe("a");
    expect(nextConcept(COURSE, new Set(["a", "b", "d"]))?.concept.key).toBe("c");
    expect(nextConcept(COURSE, new Set(["a", "b", "c", "d", "e"]))).toBeUndefined();
  });
});

describe("course progress", () => {
  it("counts concepts, a whole percent and units fully mastered", () => {
    expect(courseProgress(COURSE, new Set())).toEqual({
      mastered: 0,
      total: 5,
      percent: 0,
      unitsDone: 0,
      units: 3,
    });
    expect(courseProgress(COURSE, new Set(["a", "b", "c"]))).toEqual({
      mastered: 3,
      total: 5,
      percent: 60,
      unitsDone: 1,
      units: 3,
    });
    expect(courseProgress(COURSE, new Set(["a", "b", "c", "d", "e"]))).toMatchObject({
      percent: 100,
      unitsDone: 3,
    });
    expect(courseProgress([], new Set())).toMatchObject({ percent: 0, total: 0 });
  });
});

describe("map nodes", () => {
  it("labels the standard codes and names each node's state", () => {
    expect(standardLabel(concept("c", ["AI-X.1", "AI-X.2"]))).toBe("AI-X.1, AI-X.2");
    const mastered = new Set(["a"]);
    expect(nodeState("a", mastered, "b")).toBe("mastered");
    expect(nodeState("b", mastered, "b")).toBe("current");
    expect(nodeState("c", mastered, "b")).toBe("upcoming");
    expect(nodeState("b", mastered, null)).toBe("upcoming");
  });
});
