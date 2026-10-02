import { describe, expect, it } from "vitest";
import { s1 } from "@/content/algebra1/linear-equations/s1";
import { defineChapter } from "@/content/chapter";
import type { ChapterSection } from "@/content/types";

const { chapter } = s1.learn;
const { sections } = chapter;

/** Every sentence of prose the student reads in the chapter. */
function sentences(section: ChapterSection): string[] {
  const text = [
    section.heading,
    ...section.paragraphs,
    ...(section.points ?? []),
    ...(section.mistakes ?? []).map((m) => m.fix),
    ...(section.example?.steps ?? []).map((step) => step.reason),
  ].join(" ");
  return text.split(/(?<=[.!?])\s+/).filter(Boolean);
}

const words = (sentence: string) => sentence.split(/\s+/).length;

describe("the two-step equations chapter", () => {
  it("has the required sections in reading order", () => {
    expect(sections.map((s) => s.id)).toEqual([
      "what-it-is",
      "balance",
      "undo-moves",
      "example-positive",
      "example-negative",
      "example-word",
      "mistakes",
      "check",
      "key-learnings",
      "next",
    ]);
    expect(new Set(sections.map((s) => s.heading)).size).toBe(sections.length);
    for (const section of sections) expect(section.paragraphs.length).toBeGreaterThan(0);
  });

  it("works three examples through the engine: positive, negative, and a session word problem", () => {
    const examples = sections.flatMap((s) => (s.example ? [s] : []));
    expect(examples.map((s) => s.id)).toEqual([
      "example-positive",
      "example-negative",
      "example-word",
    ]);
    const [positive, negative, word] = examples.map((s) => s.example!);
    expect(positive).toBe(s1.learn.example);
    expect(negative).toMatchObject({ kind: "symbolic", equation: "-4x - 9 = 11" });
    expect(negative.steps.map((step) => step.equation)).toEqual([
      "-4x = 20",
      "x = -5",
      "-4(-5) - 9 = 11",
    ]);
    expect(word).toMatchObject({ kind: "word", equation: "3x + 4 = 31" });
    expect(word.text).toBe(
      "You buy 3 notebooks and a pack of pens that costs $4. You pay $31 in all. Each notebook costs the same. How many dollars is one notebook?",
    );
    expect(word.steps.map((step) => step.equation)).toEqual(["3x = 27", "x = 9", "3(9) + 4 = 31"]);
    for (const example of [positive, negative, word]) {
      expect(example.steps.at(-1)?.label).toMatch(/^Check: put -?\d+ back in for x$/);
    }
  });

  it("draws the balance, the number line and the undo ladder", () => {
    const diagrams = sections.flatMap((s) => (s.diagram ? [s.diagram.kind] : []));
    expect(diagrams).toEqual(["balance", "undo-ladder", "number-line"]);
    expect(sections.find((s) => s.id === "balance")?.diagram).toEqual({
      kind: "balance",
      a: 3,
      b: 5,
      c: 20,
    });
  });

  it("lists at least four common mistakes, each with the wrong line and its fix", () => {
    const mistakes = sections.find((s) => s.id === "mistakes")?.mistakes ?? [];
    expect(mistakes.length).toBeGreaterThanOrEqual(4);
    for (const { wrong, fix } of mistakes) {
      expect(wrong).toMatch(/=/);
      expect(fix.length).toBeGreaterThan(20);
    }
  });

  it("ends with its key learnings, one line each, then what comes next", () => {
    const summary = sections.find((s) => s.points);
    expect(summary?.id).toBe("key-learnings");
    expect(chapter.keyLearnings).toBe(summary?.points);
    for (const point of chapter.keyLearnings) {
      expect(point.split(/(?<=[.!?])\s+/)).toHaveLength(1);
      expect(words(point)).toBeLessThanOrEqual(18);
    }
    expect(sections.at(-1)?.paragraphs[0]).toMatch(/^Upcoming: equations with x on both sides/);
  });

  it("links two or three verified videos, each with its title, source and the day it was checked", () => {
    const videos = sections.flatMap((s) => (s.video ? [s.video] : []));
    expect(videos.length).toBeGreaterThanOrEqual(2);
    expect(videos.length).toBeLessThanOrEqual(3);
    for (const video of videos) {
      expect(video.title.length).toBeGreaterThan(5);
      expect(["Khan Academy", "Math Antics"]).toContain(video.source);
      expect(video.url).toMatch(/^https:\/\/www\.youtube\.com\/watch\?v=[\w-]{11}$/);
      expect(video.verified).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
    expect(new Set(videos.map((v) => v.url)).size).toBe(videos.length);
  });

  it("reads at or below an 8th-grade level: no sentence over 20 words, 13 on average", () => {
    const all = sections.flatMap(sentences);
    expect(all.length).toBeGreaterThan(60);
    for (const sentence of all) expect(words(sentence), sentence).toBeLessThanOrEqual(20);
    const average = all.reduce((sum, s) => sum + words(s), 0) / all.length;
    expect(average).toBeLessThanOrEqual(13);
  });

  it("carries no dash the copy rules ban and no exclamation", () => {
    const text = JSON.stringify(chapter);
    expect(text).not.toMatch(/[\u2013\u2014]/);
    expect(text).not.toMatch(/!/);
  });
});

describe("defineChapter", () => {
  const section = (id: string, points?: readonly string[]): ChapterSection => ({
    id,
    heading: id,
    paragraphs: ["One line."],
    points,
  });
  const five = ["a.", "b.", "c.", "d.", "e."];

  it("accepts one key-learnings section of five to seven points and lifts them out", () => {
    const chapter = defineChapter({ title: "T", sections: [section("a"), section("b", five)] });
    expect(chapter.keyLearnings).toEqual(five);
  });

  it("refuses a repeated id, an empty section, and the wrong number of key learnings", () => {
    expect(() =>
      defineChapter({ title: "T", sections: [section("a"), section("a", five)] }),
    ).toThrow('Invalid chapter "T": section id "a" is used twice');
    expect(() =>
      defineChapter({
        title: "T",
        sections: [{ id: "a", heading: "a", paragraphs: [] }, section("b", five)],
      }),
    ).toThrow('section "a" has no paragraphs');
    expect(() => defineChapter({ title: "T", sections: [section("a")] })).toThrow(
      "0 sections list key learnings; exactly one must",
    );
    expect(() =>
      defineChapter({ title: "T", sections: [section("a", five), section("b", five)] }),
    ).toThrow("2 sections list key learnings");
    expect(() => defineChapter({ title: "T", sections: [section("a", five.slice(1))] })).toThrow(
      'section "a" has 4 key learnings, not 5 to 7',
    );
  });
});
