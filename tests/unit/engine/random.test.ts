import { describe, expect, it } from "vitest";
import { createRng } from "@/engine/random";

function draw(seed: number, count: number): number[] {
  const rng = createRng(seed);
  return Array.from({ length: count }, () => rng.int(0, 1_000_000));
}

describe("createRng", () => {
  it("replays the same sequence from the same seed", () => {
    expect(draw(12345, 100)).toEqual(draw(12345, 100));
  });

  it("produces different sequences from different seeds", () => {
    expect(draw(1, 20)).not.toEqual(draw(2, 20));
  });

  it("treats seeds as unsigned 32-bit integers", () => {
    expect(draw(-1, 10)).toEqual(draw(0xffffffff, 10));
  });

  it("draws inclusive integers and reaches both ends of the range", () => {
    const rng = createRng(7);
    const seen = new Set<number>();
    for (let i = 0; i < 2000; i += 1) {
      const value = rng.int(-3, 3);
      expect(Number.isInteger(value)).toBe(true);
      expect(value).toBeGreaterThanOrEqual(-3);
      expect(value).toBeLessThanOrEqual(3);
      seen.add(value);
    }
    expect([...seen].sort((x, y) => x - y)).toEqual([-3, -2, -1, 0, 1, 2, 3]);
  });
});
