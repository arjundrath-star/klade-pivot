import { describe, expect, it } from "vitest";
import {
  createRedactingStream,
  filterTarget,
  redactSolution,
  REDACTED,
  splitComplete,
} from "@/coach/policy";
import { generateInstance } from "@/engine/generate";
import { s1 } from "@/content/algebra1/linear-equations/s1";

describe("filterTarget", () => {
  it("takes the solution and the magnitudes written in the equation", () => {
    // s1-two-step with seed 42 draws 5x + 15 = 55.
    const instance = generateInstance(s1.guided[0], 42);
    expect(instance.values).toEqual({ a: 5, b: 15, c: 55 });
    expect(filterTarget(instance)).toEqual({ solution: 8, given: [5, 15, 55] });
  });
});

describe("redactSolution", () => {
  // 3x + 5 = 20: the solution is also a number in the equation.
  const shared = { solution: 5, given: [3, 5, 20] };

  it.each([
    ["So x = 5.", "So x = ?."],
    ["x=5", "x=?"],
    ["x = +5", "x = ?"],
    ["That means x is 5", "That means x is ?"],
    ["x → 5", "x → ?"],
    ["The answer is 5.", "The answer is ?."],
    ["The answer is Five.", "The answer is ?."],
    ["you get 5, then check it", "you get ?, then check it"],
    ["which gives 5.0", "which gives ?"],
    ["5 is the answer", "? is the answer"],
    ["Divide and it comes out to 5!", "Divide and it comes out to ?!"],
    ["Subtract 5 from both sides. Then x = 5.", "Subtract 5 from both sides. Then x = ?."],
  ])("hides %j as %j", (text, expected) => {
    expect(redactSolution(text, shared)).toEqual({ text: expected, redacted: true });
  });

  it.each([
    "Subtract 5 from both sides, then divide by 3.",
    "The equation is 3x + 5 = 20.",
    "What is 20 - 5?",
    "So 3x = 15. What undoes multiplying by 3?",
    "What do you get when you take 5 away from both sides?",
    "That leaves 5x on the left.",
  ])("leaves %j alone", (text) => {
    expect(redactSolution(text, shared)).toEqual({ text, redacted: false });
  });

  it("hides a solution that is not in the equation wherever it appears", () => {
    // 2x + 4 = 18
    const target = { solution: 7, given: [2, 4, 18] };
    expect(redactSolution("Try 7.", target)).toEqual({ text: `Try ${REDACTED}.`, redacted: true });
    expect(redactSolution("x = -7", target).text).toBe("x = ?");
    expect(redactSolution("It is seven.", target).text).toBe("It is ?.");
    expect(redactSolution("So 17 stays and 7.5 is out", target).redacted).toBe(false);
    expect(redactSolution("Divide 14 by 2.", target).redacted).toBe(false);
  });

  it("needs the sign for a negative solution outside the equation", () => {
    // 2x + 5 = -9
    const target = { solution: -7, given: [2, 5, 9] };
    expect(redactSolution("So x = -7.", target).text).toBe("So x = ?.");
    expect(redactSolution("So x = \u22127.", target).text).toBe("So x = ?.");
    expect(redactSolution("x is negative seven", target).text).toBe("x is ?");
    expect(redactSolution("You get -7 here", target).text).toBe("You get ? here");
    expect(redactSolution("Divide both sides by 7.", target).redacted).toBe(false);
    expect(redactSolution("minus seven", target).text).toBe("?");
  });

  it("lets small numbers through unless a cue points at them", () => {
    // 4x - 3 = 1
    const target = { solution: 1, given: [4, 3, 1] };
    const hint = "Get x by itself on one side. Step 1 is to add 3 to both sides. What is left?";
    expect(redactSolution(hint, target)).toEqual({ text: hint, redacted: false });
    expect(redactSolution("So x = 1.", target).text).toBe("So x = ?.");
    expect(redactSolution("The answer is one.", target).text).toBe("The answer is ?.");
    const two = { solution: 2, given: [5, 7, 17] };
    expect(redactSolution("Both sides, so two steps.", two).redacted).toBe(false);
    expect(redactSolution("You get 2.", two).text).toBe("You get ?.");
  });

  it("spells out compound numbers", () => {
    const target = { solution: 25, given: [] };
    expect(redactSolution("twenty-five", target).text).toBe("?");
    expect(redactSolution("Twenty five", target).text).toBe("?");
    expect(redactSolution("125 or 250", target).redacted).toBe(false);
  });

  it("falls back to digits for a value too large to spell", () => {
    const target = { solution: 1500, given: [] };
    expect(redactSolution("x = 1500", target).text).toBe("x = ?");
    expect(redactSolution("x = 15000", target).redacted).toBe(false);
  });
});

describe("splitComplete", () => {
  it("keeps a sentence until whitespace shows it ended", () => {
    expect(splitComplete("Hello. World")).toEqual({ complete: "Hello.", rest: " World" });
    expect(splitComplete("Hello.")).toEqual({ complete: "", rest: "Hello." });
    expect(splitComplete("x = 5.0 is")).toEqual({ complete: "", rest: "x = 5.0 is" });
    expect(splitComplete("One\nTwo")).toEqual({ complete: "", rest: "One\nTwo" });
    expect(splitComplete("So x =\n5. Now")).toEqual({ complete: "So x =\n5.", rest: " Now" });
    expect(splitComplete("Why? Because! So. no")).toEqual({
      complete: "Why? Because! So.",
      rest: " no",
    });
  });
});

describe("createRedactingStream", () => {
  const target = { solution: 5, given: [3, 5, 20] };
  const text =
    "Nice try. Subtract 5 from both sides first. Then you have 3x = 15, and x = 5. What do you divide by?";

  it("matches the whole-text filter however the text is chunked", () => {
    const whole = redactSolution(text, target);
    expect(whole.redacted).toBe(true);
    for (const size of [1, 2, 3, 7, 11, 50, 500]) {
      const stream = createRedactingStream(target);
      let out = "";
      for (let i = 0; i < text.length; i += size) out += stream.push(text.slice(i, i + size));
      out += stream.flush();
      expect(out).toBe(whole.text);
      expect(stream.redacted()).toBe(true);
    }
  });

  it("holds an unfinished sentence back until it ends", () => {
    const stream = createRedactingStream({ solution: 5, given: [] });
    expect(stream.push("First look at the 5. Then x = 1")).toBe("First look at the ?.");
    expect(stream.push("5 is what you have. ")).toBe(" Then x = 15 is what you have.");
    expect(stream.push("Now x = 5")).toBe("");
    expect(stream.flush()).toBe(" Now x = ?");
    expect(stream.redacted()).toBe(true);
  });

  it("catches a value pushed onto the next line", () => {
    const stream = createRedactingStream(target);
    expect(stream.push("So x =\n5. What next? ")).toBe("So x =\n?. What next?");
    expect(stream.redacted()).toBe(true);
  });

  it("reports no redaction for a clean reply", () => {
    const stream = createRedactingStream(target);
    const out = stream.push("What did you try first? ") + stream.flush();
    expect(out).toBe("What did you try first? ");
    expect(stream.redacted()).toBe(false);
  });
});
