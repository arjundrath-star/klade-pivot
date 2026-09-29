import { describe, expect, it } from "vitest";
import { checkAnswer, parseAnswer } from "@/engine/check";
import { rational } from "@/engine/rational";

describe("checkAnswer", () => {
  it.each([
    ["5", rational(5)],
    ["x = 5", rational(5)],
    ["x=5", rational(5)],
    ["X = 5", rational(5)],
    ["  x  =  5  ", rational(5)],
    ["+5", rational(5)],
    ["5.0", rational(5)],
    ["5.00000000000000000000", rational(5)],
    ["10/2", rational(5)],
    ["-3", rational(-3)],
    ["x = -3", rational(-3)],
    ["−3", rational(-3)],
    ["-6/2", rational(-3)],
    ["1/2", rational(1, 2)],
    ["0.5", rational(1, 2)],
    [".5", rational(1, 2)],
    ["2/4", rational(1, 2)],
    ["x = -3/2", rational(-3, 2)],
    ["-1.5", rational(-3, 2)],
    ["0", rational(0)],
    ["-0", rational(0)],
  ])("accepts %j", (input, expected) => {
    expect(checkAnswer(input, expected).correct).toBe(true);
  });

  it.each([
    ["4", rational(5)],
    ["x = 6", rational(5)],
    ["-5", rational(5)],
    ["5", rational(-5)],
    ["1/3", rational(1, 2)],
    ["0.49", rational(1, 2)],
    ["3/2", rational(-3, 2)],
  ])("rejects the wrong value %j", (input, expected) => {
    const result = checkAnswer(input, expected);
    expect(result.correct).toBe(false);
    expect(result.normalized).not.toBeNull();
  });

  it.each([
    "",
    "   ",
    "x",
    "x =",
    "5x",
    "y = 5",
    "5 = x",
    "x == 5",
    "--5",
    "- 5",
    "5 5",
    "5.",
    "1.2.3",
    "1/0",
    "0/0",
    "1/-2",
    "1.5/2",
    "1e3",
    "1,000",
    "five",
    "Infinity",
    "NaN",
    "0x10",
    "9007199254740993",
    "0.1234567890123456",
  ])("rejects malformed input %j", (input) => {
    expect(checkAnswer(input, rational(5))).toEqual({
      correct: false,
      normalized: null,
      expected: "5",
    });
  });

  it("reports the normalized answer and the expected answer in lowest terms", () => {
    expect(checkAnswer("x = 0.75", rational(-6, 4))).toEqual({
      correct: false,
      normalized: "3/4",
      expected: "-3/2",
    });
    expect(checkAnswer("-12/8", rational(-3, 2))).toEqual({
      correct: true,
      normalized: "-3/2",
      expected: "-3/2",
    });
  });
});

describe("parseAnswer", () => {
  it("keeps the largest accepted inputs exact", () => {
    expect(parseAnswer("999999999999999")).toEqual({ num: 999999999999999, den: 1 });
    expect(parseAnswer("0.00000000000001")).toEqual({ num: 1, den: 100000000000000 });
    expect(parseAnswer("1/999999999999999")).toEqual({ num: 1, den: 999999999999999 });
  });
});
