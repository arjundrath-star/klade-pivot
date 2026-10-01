import type { UnitEstimate } from "@/engine/pace";

/**
 * Algebra 1 in course order with sessions per unit. [Estimate] memo §6.3: the counts add up to
 * `ALGEBRA1_SESSION_ESTIMATE` and are to be validated with teachers. Only the first unit has
 * content today; the pace plan uses the rest for its milestone dates.
 */
export const ALGEBRA1_UNITS: readonly UnitEstimate[] = [
  { title: "Linear equations in one variable", sessions: 14 },
  { title: "Linear inequalities", sessions: 10 },
  { title: "Functions", sessions: 14 },
  { title: "Linear functions and graphs", sessions: 16 },
  { title: "Systems of equations", sessions: 12 },
  { title: "Exponents and exponential functions", sessions: 14 },
  { title: "Polynomials and factoring", sessions: 16 },
  { title: "Quadratic functions and equations", sessions: 16 },
  { title: "Data and statistics", sessions: 8 },
];
