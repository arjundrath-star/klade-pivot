import { describe, expect, it } from "vitest";
import { OnboardingInput } from "@/onboarding/schema";

const VALID = {
  parentName: "Sam",
  studentName: " Ava ",
  grade: 7,
  pronoun: "she",
  targetDate: "2027-05-31",
  pace: "on-track",
  sessionDays: ["mon", "tue", "thu", "sun"],
  sessionTime: "17:00",
  timerMode: "extended",
  interests: ["gaming", "animals"],
  favorites: { animals: "Dogs" },
};

const accepts = (input: unknown) => OnboardingInput.safeParse(input).success;

describe("OnboardingInput", () => {
  it("accepts a complete setup and trims the names", () => {
    const parsed = OnboardingInput.parse(VALID);
    expect(parsed.studentName).toBe("Ava");
    expect(parsed.favorites).toEqual({ animals: "Dogs" });
  });

  it("refuses any field it does not store, such as an email or a birthdate", () => {
    expect(accepts({ ...VALID, email: "ava@example.com" })).toBe(false);
    expect(accepts({ ...VALID, birthdate: "2014-04-01" })).toBe(false);
  });

  it("takes a first name only", () => {
    expect(accepts({ ...VALID, studentName: "Mary-Kate" })).toBe(true);
    expect(accepts({ ...VALID, studentName: "D'Andre" })).toBe(true);
    expect(accepts({ ...VALID, studentName: "José" })).toBe(true);
    expect(accepts({ ...VALID, studentName: "" })).toBe(false);
    expect(accepts({ ...VALID, studentName: "   " })).toBe(false);
    expect(accepts({ ...VALID, studentName: "ava@example.com" })).toBe(false);
    expect(accepts({ ...VALID, studentName: "<b>Ava</b>" })).toBe(false);
    expect(accepts({ ...VALID, parentName: "x".repeat(31) })).toBe(false);
  });

  it("takes grades 6 to 10 and the three pronouns", () => {
    expect(accepts({ ...VALID, grade: 6 })).toBe(true);
    expect(accepts({ ...VALID, grade: 10 })).toBe(true);
    expect(accepts({ ...VALID, grade: 5 })).toBe(false);
    expect(accepts({ ...VALID, grade: 11 })).toBe(false);
    expect(accepts({ ...VALID, grade: 7.5 })).toBe(false);
    expect(accepts({ ...VALID, pronoun: "they" })).toBe(true);
    expect(accepts({ ...VALID, pronoun: "xe" })).toBe(false);
  });

  it("needs a real target date and a 24-hour start time", () => {
    expect(accepts({ ...VALID, targetDate: "2027-02-30" })).toBe(false);
    expect(accepts({ ...VALID, targetDate: "May 2027" })).toBe(false);
    expect(accepts({ ...VALID, sessionTime: "23:55" })).toBe(true);
    expect(accepts({ ...VALID, sessionTime: "24:00" })).toBe(false);
    expect(accepts({ ...VALID, sessionTime: "5 PM" })).toBe(false);
  });

  it("needs one distinct session day per session a week of the pace", () => {
    expect(accepts({ ...VALID, sessionDays: ["mon", "wed", "fri", "sat"] })).toBe(true);
    expect(accepts({ ...VALID, sessionDays: ["mon", "wed", "fri"] })).toBe(false);
    expect(accepts({ ...VALID, sessionDays: ["mon", "mon", "fri", "sat"] })).toBe(false);
    expect(accepts({ ...VALID, pace: "standard", sessionDays: ["mon", "wed", "fri"] })).toBe(true);
    expect(accepts({ ...VALID, sessionDays: ["mon", "tue", "thu", "someday"] })).toBe(false);
  });

  it("takes 1 or 2 distinct interests of the six", () => {
    expect(accepts({ ...VALID, interests: ["gaming"], favorites: {} })).toBe(true);
    expect(accepts({ ...VALID, interests: [], favorites: {} })).toBe(false);
    expect(accepts({ ...VALID, interests: ["gaming", "animals", "music"] })).toBe(false);
    expect(accepts({ ...VALID, interests: ["animals", "animals"] })).toBe(false);
    expect(accepts({ ...VALID, interests: ["fashion"], favorites: {} })).toBe(false);
  });

  it("takes a favorite only from its interest's list, for an interest that was picked", () => {
    expect(accepts({ ...VALID, favorites: { gaming: "Racing games", animals: "Dogs" } })).toBe(true);
    expect(accepts({ ...VALID, favorites: { animals: "My dog Rex" } })).toBe(false);
    expect(accepts({ ...VALID, favorites: { sports: "Soccer" } })).toBe(false);
    expect(accepts({ ...VALID, favorites: { gaming: "Dogs" } })).toBe(false);
    expect(accepts({ ...VALID, favorites: { school: "Math" } })).toBe(false);
  });
});
