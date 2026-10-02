import { ALGEBRA1_COURSE } from "@/content/algebra1/course";
import { allBadges } from "@/engine/progress";

/** Every badge the course has, in shelf order. Server-side only: the course file stays data. */
export const ALGEBRA1_BADGES = allBadges(ALGEBRA1_COURSE);
