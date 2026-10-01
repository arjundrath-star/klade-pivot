import { ALGEBRA1_UNITS } from "@/content/algebra1/units";
import { S1_KEY } from "@/content/sessions";
import { allBadges, type UnitOutline } from "@/engine/progress";

interface UnitContent extends UnitOutline {
  title: string;
}

/**
 * The units that have content, each with the concepts that ship today, in course order. One
 * concept is one session template. Badges and levels read this list, and the seed writes the
 * curriculum rows from it.
 */
export const ALGEBRA1_CONTENT: readonly UnitContent[] = [
  {
    number: 1,
    title: ALGEBRA1_UNITS[0].title,
    concepts: [{ key: S1_KEY, title: "Two-step equations" }],
  },
];

/** Every badge the course has, in shelf order. */
export const ALGEBRA1_BADGES = allBadges(ALGEBRA1_CONTENT);
