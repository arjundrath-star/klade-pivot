import { describe, expect, it } from "vitest";
import { ALGEBRA1_BADGES } from "@/content/algebra1/badges";
import { ALGEBRA1_COURSE } from "@/content/algebra1/course";
import { S1_KEY } from "@/content/keys";
import { S1_TEMPLATE_ID, templateIdFor } from "@/db/demo";
import { conceptPlace, courseConcepts } from "@/engine/course";
import { ALGEBRA1_SESSION_ESTIMATE } from "@/engine/pace";

const concepts = courseConcepts(ALGEBRA1_COURSE);

// The outline's coverage check: every Algebra I standard in the Regents blueprint, at least once.
const BLUEPRINT = [
  "AI-N.RN.3a",
  "AI-N.RN.3b",
  "AI-N.Q.1",
  "AI-N.Q.3",
  "AI-A.SSE.1",
  "AI-A.SSE.1a",
  "AI-A.SSE.1b",
  "AI-A.SSE.2",
  "AI-A.SSE.3",
  "AI-A.SSE.3c",
  "AI-A.APR.1",
  "AI-A.APR.3",
  "AI-A.CED.1",
  "AI-A.CED.2",
  "AI-A.CED.3",
  "AI-A.CED.4",
  "AI-A.REI.1a",
  "AI-A.REI.3",
  "AI-A.REI.4",
  "AI-A.REI.4a",
  "AI-A.REI.4b",
  "AI-A.REI.6a",
  "AI-A.REI.7a",
  "AI-A.REI.10",
  "AI-A.REI.11",
  "AI-A.REI.12",
  "AI-F.IF.1",
  "AI-F.IF.2",
  "AI-F.IF.3",
  "AI-F.IF.4",
  "AI-F.IF.5",
  "AI-F.IF.6",
  "AI-F.IF.7a",
  "AI-F.IF.7b",
  "AI-F.IF.8",
  "AI-F.IF.8a",
  "AI-F.IF.9",
  "AI-F.BF.1a",
  "AI-F.BF.3a",
  "AI-F.LE.1",
  "AI-F.LE.1a",
  "AI-F.LE.1b",
  "AI-F.LE.1c",
  "AI-F.LE.2",
  "AI-F.LE.3",
  "AI-F.LE.5",
  "AI-S.ID.1",
  "AI-S.ID.2",
  "AI-S.ID.3",
  "AI-S.ID.5",
  "AI-S.ID.6",
  "AI-S.ID.6a",
  "AI-S.ID.7",
  "AI-S.ID.8",
  "AI-S.ID.9",
];

describe("the Algebra I course", () => {
  it("has the outline's nine units and 49 concepts, every unit with concepts", () => {
    expect(ALGEBRA1_COURSE).toHaveLength(9);
    expect(concepts).toHaveLength(49);
    expect(ALGEBRA1_COURSE.map((unit) => unit.number)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(ALGEBRA1_COURSE.map((unit) => unit.concepts.length)).toEqual([
      4, 7, 5, 6, 5, 4, 4, 8, 6,
    ]);
  });

  it("gives every concept and unit a key of its own, and every key a template id of its own", () => {
    const keys = concepts.map((place) => place.concept.key);
    expect(new Set(keys).size).toBe(keys.length);
    expect(new Set(keys.map(templateIdFor)).size).toBe(keys.length);
    const slugs = ALGEBRA1_COURSE.map((unit) => unit.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const key of keys) expect(key).toMatch(/^algebra1\/[a-z-]+\/[a-z0-9-]+$/);
  });

  it("gives every concept a title, a state code and a Common Core code", () => {
    for (const concept of ALGEBRA1_COURSE.flatMap((unit) => unit.concepts)) {
      expect(concept.title.length).toBeGreaterThan(0);
      expect(concept.nys.length).toBeGreaterThan(0);
      expect(concept.ccss.length).toBeGreaterThan(0);
      for (const code of concept.nys) expect(code).toMatch(/^AI-[A-Z]\.[A-Z]+\.\d+[a-z]?$/);
      for (const code of concept.ccss) expect(code).toMatch(/^HS[A-Z]-[A-Z]+\.[A-D]\.\d+[a-z]?$/);
    }
  });

  it("covers every standard in the Regents blueprint", () => {
    const covered = new Set(concepts.flatMap((place) => place.concept.nys));
    for (const code of BLUEPRINT) expect(covered).toContain(code);
  });

  it("has exactly one playable concept, two-step equations, at Unit 2 concept 2", () => {
    const playable = concepts.filter((place) => place.concept.playable);
    expect(playable.map((place) => place.concept.key)).toEqual([S1_KEY]);
    expect(conceptPlace(ALGEBRA1_COURSE, S1_KEY)).toMatchObject({
      position: 6,
      total: 49,
      unit: { number: 2, title: "Linear equations and inequalities in one variable" },
      concept: { title: "Solving two-step linear equations", nys: ["AI-A.REI.3"] },
    });
    // The template id the first concept shipped under, which its session logs point at.
    expect(S1_TEMPLATE_ID).toBe("algebra-1-linear-equations-s1");
  });

  it("spreads the session estimate across the units, at least one session a concept", () => {
    const total = ALGEBRA1_COURSE.reduce((sum, unit) => sum + unit.sessions, 0);
    expect(total).toBe(ALGEBRA1_SESSION_ESTIMATE);
    for (const unit of ALGEBRA1_COURSE) {
      expect(unit.sessions).toBeGreaterThanOrEqual(unit.concepts.length);
    }
  });

  it("has a badge for every concept and every unit, plus the streak and the explanation", () => {
    expect(ALGEBRA1_BADGES).toHaveLength(49 + 9 + 2);
    expect(ALGEBRA1_BADGES.filter((badge) => badge.key.startsWith("concept:"))).toHaveLength(49);
  });
});
