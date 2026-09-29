import { describe, expect, it } from "vitest";
import { checkAnswer } from "@/engine/check";
import { generateInstance } from "@/engine/generate";
import { rational } from "@/engine/rational";
import { renderProblem, selectVariant } from "@/engine/render";
import { INTERESTS, type Interest } from "@/engine/types";
import { bothSidesWord, distributionSymbolic, FIXTURES, twoStepWord } from "./fixtures";

describe("selectVariant", () => {
  it("falls back to neutral when the student has no interests", () => {
    expect(selectVariant([], 0)).toBe("neutral");
    expect(selectVariant([], 3)).toBe("neutral");
  });

  it("uses a single interest for every problem", () => {
    expect([0, 1, 2].map((i) => selectVariant(["gaming"], i))).toEqual([
      "gaming",
      "gaming",
      "gaming",
    ]);
  });

  it("rejects an index that is not a problem position", () => {
    expect(() => selectVariant(["sports"], -1)).toThrow(RangeError);
    expect(() => selectVariant(["sports"], 1.5)).toThrow(RangeError);
  });

  it("rotates between two interests by problem index", () => {
    expect([0, 1, 2, 3].map((i) => selectVariant(["sports", "music"], i))).toEqual([
      "sports",
      "music",
      "sports",
      "music",
    ]);
  });
});

describe("renderProblem", () => {
  it("frames the same instance differently per interest with the same expected answer", () => {
    for (const template of [twoStepWord, bothSidesWord]) {
      const instance = generateInstance(template, 2026);
      const sports = renderProblem(template, instance, ["sports"], 0);
      const gaming = renderProblem(template, instance, ["gaming"], 0);
      expect(sports.text).not.toBe(gaming.text);
      const answer = String(instance.solution);
      const expected = rational(instance.solution);
      expect(checkAnswer(answer, expected)).toEqual({
        correct: true,
        normalized: answer,
        expected: answer,
      });
    }
  });

  it("substitutes the instance values verbatim", () => {
    const instance = generateInstance(twoStepWord, 9);
    const { a, b, c } = instance.values;
    expect(renderProblem(twoStepWord, instance, ["music"], 0)).toEqual({
      kind: "word",
      variant: "music",
      text: `Your playlist has ${b} songs. You add the same number of songs from each of ${a} albums and end up with ${c} songs. How many songs did you add from each album?`,
    });
  });

  it("never leaves an unreplaced placeholder", () => {
    const profiles: Interest[][] = [[], ...INTERESTS.map((interest) => [interest])];
    for (const template of FIXTURES) {
      for (let seed = 0; seed < 50; seed += 1) {
        const instance = generateInstance(template, seed);
        for (const profile of profiles) {
          expect(renderProblem(template, instance, profile, seed).text).not.toMatch(/[{}]/);
        }
      }
    }
  });

  it("shows symbolic problems with their equation and ignores interests", () => {
    const instance = generateInstance(distributionSymbolic, 4);
    const rendered = renderProblem(distributionSymbolic, instance, ["food", "animals"], 1);
    expect(rendered.kind).toBe("symbolic");
    expect(rendered.text).toBe("Solve for x.");
    expect(rendered.kind === "symbolic" && rendered.equation).toMatch(
      /^-?\d*\(x [+-] \d+\) [+-] \d*x = -?\d+$/,
    );
  });

  it("refuses to render an instance with another template", () => {
    const instance = generateInstance(twoStepWord, 1);
    expect(() => renderProblem(bothSidesWord, instance, [], 0)).toThrow(
      'Instance of "fixture-two-step-word" rendered with "fixture-both-sides-word"',
    );
  });
});
