import { S1_KEY } from "@/content/keys";
import type { CourseUnitOutline } from "@/engine/course";
import type { UnitEstimate } from "@/engine/pace";

/**
 * Algebra I as the product teaches it: nine units and 49 concepts in course order, each concept
 * with its New York State Next Generation code and the Common Core identifier it corresponds to.
 * The pace plan, the planner, levels, badges, the course map and the seed all read this list,
 * and the onboarding form reads it in the browser, so this file holds data and nothing else.
 *
 * Source: docs/curriculum/algebra1-outline.md, built from these documents, all accessed 2026-10-02:
 *
 * 1. New York State Next Generation Mathematics Learning Standards, Algebra I Crosswalk. NYSED.
 *    The `AI-` codes and their wording.
 *    https://www.nysed.gov/sites/default/files/programs/curriculum-instruction/nys-math-standards-algebra-i-crosswalk.pdf
 * 2. Educator Guide to the Regents Examination in Algebra I, Next Generation Mathematics Learning
 *    Standards. NYSED, updated October 2023. The exam blueprint and the cluster letters that turn
 *    each NYS code into its CCSS identifier.
 *    https://www.nysed.gov/sites/default/files/programs/state-assessment/algebra-one-educator-guide-2023.pdf
 * 3. Next Generation Mathematics Learning Standards: Suggested Breakdown of Instructional Time.
 *    NYSED. Units of study are locally determined by districts.
 *    https://www.nysed.gov/sites/default/files/programs/standards-instruction/next-generation-mathematics-learning-standards-suggested-breakdown-of-instructional-time.pdf
 * 4. New York State Next Generation Mathematics Learning Standards, Grade 7 and Grade 8
 *    Crosswalks. NYSED. The note on two-step equations below.
 *    https://www.nysed.gov/sites/default/files/programs/curriculum-instruction/nys-math-standards-grade-7-crosswalk.pdf
 *    https://www.nysed.gov/sites/default/files/programs/curriculum-instruction/nys-math-standards-grade-8-crosswalk.pdf
 * 5. Common Core State Standards for Mathematics, High School. NGA Center and CCSSO.
 *    https://www.thecorestandards.org/Math/Content/HSA/REI/
 *
 * NYSED publishes standards, clusters and an exam blueprint, not a unit sequence (source 3). The
 * unit groupings and teaching order are the outline author's organization of the NYSED standards,
 * following the common Regents sequence: linear first, then exponential, then quadratic,
 * statistics last. Where NYS added a letter that CCSS lacks (AI-N.RN.3a and 3b, AI-A.REI.1a,
 * AI-A.REI.6a, AI-A.REI.7a, AI-F.BF.3a), the CCSS code given is the parent standard.
 *
 * Unit 2, concepts 2 to 4: NYSED places fluency with px + q = r in grade 7 (NY-7.EE.4a) and
 * variables on both sides plus distribution in grade 8 (NY-8.EE.7b). Algebra I reaches them through
 * AI-A.REI.3. For a catching-up student these are the on-ramp; for an ahead student they are
 * review. Only concept 2, solving two-step linear equations (`S1_KEY`), is built; every other
 * concept is on the map and not playable yet.
 */

export interface CourseConcept {
  /** The session content key the concept's session template points at. */
  key: string;
  /** The concept as the outline words it. */
  title: string;
  /** NYS Next Generation codes, as the crosswalk prints them. */
  nys: readonly string[];
  /** The Common Core identifiers the NYS codes correspond to. */
  ccss: readonly string[];
  /** The concept has a session a student can do today. */
  playable: boolean;
}

export interface CourseUnit extends CourseUnitOutline, UnitEstimate {
  number: number;
  /** The unit's part of its database id and its concepts' keys. */
  slug: string;
  title: string;
  /** What the unit is about, in one line. */
  summary: string;
  /**
   * [Estimate] 30-minute sessions the unit takes. The nine counts add up to
   * `ALGEBRA1_SESSION_ESTIMATE`, 120 sessions for 49 concepts: about two and a half a concept, for
   * a first pass, a repeat where the exit check fails, and review, weighted toward the units the
   * outline expects to take longest for a catching-up student (systems, factoring, quadratics).
   * To be validated with teachers; a test keeps the sum at the estimate.
   */
  sessions: number;
  concepts: readonly CourseConcept[];
}

interface ConceptSpec {
  slug: string;
  title: string;
  nys: readonly string[];
  ccss: readonly string[];
}

interface UnitSpec {
  slug: string;
  title: string;
  summary: string;
  sessions: number;
  concepts: readonly ConceptSpec[];
}

const COURSE_KEY_PREFIX = "algebra1";

function conceptKey(unit: string, concept: string): string {
  return `${COURSE_KEY_PREFIX}/${unit}/${concept}`;
}

const UNITS: readonly UnitSpec[] = [
  {
    slug: "numbers-and-expressions",
    title: "Numbers, quantities, and expressions",
    summary:
      "Working with units, rational and irrational numbers, and reading the parts of an expression.",
    sessions: 8,
    concepts: [
      {
        slug: "units-and-precision",
        title: "Units and precision in multi-step problems",
        nys: ["AI-N.Q.1", "AI-N.Q.3"],
        ccss: ["HSN-Q.A.1", "HSN-Q.A.3"],
      },
      {
        slug: "rational-numbers-and-roots",
        title:
          "Operations with rational numbers and square roots, including rationalizing numerical denominators",
        nys: ["AI-N.RN.3a"],
        ccss: ["HSN-RN.B.3"],
      },
      {
        slug: "rational-and-irrational-sums",
        title: "Sums and products of rational and irrational numbers",
        nys: ["AI-N.RN.3b"],
        ccss: ["HSN-RN.B.3"],
      },
      {
        slug: "parts-of-an-expression",
        title:
          "Parts of an expression, polynomial standard form, and reading expressions in context",
        nys: ["AI-A.SSE.1", "AI-A.SSE.1a", "AI-A.SSE.1b"],
        ccss: ["HSA-SSE.A.1", "HSA-SSE.A.1a", "HSA-SSE.A.1b"],
      },
    ],
  },
  {
    slug: "linear-equations",
    title: "Linear equations and inequalities in one variable",
    summary:
      "Solving for one unknown, justifying every step, and writing the equation from a situation.",
    sessions: 16,
    concepts: [
      {
        slug: "justifying-steps",
        title: "Explaining each step of a solution as a reason",
        nys: ["AI-A.REI.1a"],
        ccss: ["HSA-REI.A.1"],
      },
      {
        // The slug its session content shipped under: the key must stay `S1_KEY`.
        slug: "s1",
        title: "Solving two-step linear equations",
        nys: ["AI-A.REI.3"],
        ccss: ["HSA-REI.B.3"],
      },
      {
        slug: "variables-on-both-sides",
        title: "Equations with variables on both sides",
        nys: ["AI-A.REI.3"],
        ccss: ["HSA-REI.B.3"],
      },
      {
        slug: "distribution-and-like-terms",
        title: "Equations with distribution and like terms",
        nys: ["AI-A.REI.3"],
        ccss: ["HSA-REI.B.3"],
      },
      {
        slug: "letter-coefficients-and-formulas",
        title: "Equations with letter coefficients and rearranging formulas",
        nys: ["AI-A.REI.3", "AI-A.CED.4"],
        ccss: ["HSA-REI.B.3", "HSA-CED.A.4"],
      },
      {
        slug: "linear-inequalities",
        title: "Solving linear inequalities in one variable (no compound inequalities)",
        nys: ["AI-A.REI.3"],
        ccss: ["HSA-REI.B.3"],
      },
      {
        slug: "equations-from-context",
        title: "Writing equations and inequalities in one variable from a context",
        nys: ["AI-A.CED.1"],
        ccss: ["HSA-CED.A.1"],
      },
    ],
  },
  {
    slug: "functions",
    title: "Functions",
    summary: "What a function is, how to name one, and how to read its graph or table.",
    sessions: 11,
    concepts: [
      {
        slug: "functions-domain-range",
        title: "Functions, domain, and range",
        nys: ["AI-F.IF.1"],
        ccss: ["HSF-IF.A.1"],
      },
      {
        slug: "function-notation",
        title: "Function notation and evaluating functions in context",
        nys: ["AI-F.IF.2"],
        ccss: ["HSF-IF.A.2"],
      },
      {
        slug: "graphs-as-solution-sets",
        title: "A graph as the set of all solutions; domain from a graph and from a context",
        nys: ["AI-A.REI.10", "AI-F.IF.5"],
        ccss: ["HSA-REI.D.10", "HSF-IF.B.5"],
      },
      {
        slug: "key-features",
        title:
          "Key features of graphs and tables: intercepts, increasing and decreasing, maximum and minimum",
        nys: ["AI-F.IF.4"],
        ccss: ["HSF-IF.B.4"],
      },
      {
        slug: "average-rate-of-change",
        title: "Average rate of change over an interval",
        nys: ["AI-F.IF.6"],
        ccss: ["HSF-IF.B.6"],
      },
    ],
  },
  {
    slug: "linear-functions",
    title: "Linear functions",
    summary: "Slope, lines, sequences, and the first non-linear graphs built from lines.",
    sessions: 15,
    concepts: [
      {
        slug: "graphing-linear-functions",
        title: "Graphing linear functions and showing key features",
        nys: ["AI-F.IF.7a"],
        ccss: ["HSF-IF.C.7a"],
      },
      {
        slug: "writing-linear-functions",
        title: "Writing a linear function from a graph, a description, or two points",
        nys: ["AI-F.LE.2", "AI-A.CED.2"],
        ccss: ["HSF-LE.A.2", "HSA-CED.A.2"],
      },
      {
        slug: "slope-and-intercept-in-context",
        title: "Interpreting slope and intercept in context",
        nys: ["AI-F.LE.5"],
        ccss: ["HSF-LE.B.5"],
      },
      {
        slug: "arithmetic-sequences",
        title: "Arithmetic sequences as functions",
        nys: ["AI-F.IF.3", "AI-F.BF.1a"],
        ccss: ["HSF-IF.A.3", "HSF-BF.A.1a"],
      },
      {
        slug: "absolute-value-step-piecewise",
        title: "Absolute value, step, piecewise, and square root functions",
        nys: ["AI-F.IF.7b"],
        ccss: ["HSF-IF.C.7b"],
      },
      {
        slug: "transformations",
        title: "Transformations: f(x) + k, k f(x), and f(x + k)",
        nys: ["AI-F.BF.3a"],
        ccss: ["HSF-BF.B.3"],
      },
    ],
  },
  {
    slug: "systems",
    title: "Systems of equations and inequalities",
    summary: "Two unknowns, two conditions, and constraints from real situations.",
    sessions: 14,
    concepts: [
      {
        slug: "systems-by-graphing",
        title: "Solving linear systems by graphing",
        nys: ["AI-A.REI.6a"],
        ccss: ["HSA-REI.C.6"],
      },
      {
        slug: "systems-by-substitution",
        title: "Solving linear systems by substitution",
        nys: ["AI-A.REI.6a"],
        ccss: ["HSA-REI.C.6"],
      },
      {
        slug: "systems-by-elimination",
        title: "Solving linear systems by elimination",
        nys: ["AI-A.REI.6a"],
        ccss: ["HSA-REI.C.6"],
      },
      {
        slug: "inequalities-in-two-variables",
        title: "Graphing linear inequalities and systems of inequalities in two variables",
        nys: ["AI-A.REI.12"],
        ccss: ["HSA-REI.D.12"],
      },
      {
        slug: "modeling-constraints",
        title: "Modeling constraints and judging viable solutions",
        nys: ["AI-A.CED.3"],
        ccss: ["HSA-CED.A.3"],
      },
    ],
  },
  {
    slug: "exponential-functions",
    title: "Exponential functions",
    summary: "Growth by equal factors, and why it beats growth by equal differences.",
    sessions: 11,
    concepts: [
      {
        slug: "exponent-properties",
        title: "Rewriting exponential expressions with exponent properties",
        nys: ["AI-A.SSE.3", "AI-A.SSE.3c"],
        ccss: ["HSA-SSE.B.3", "HSA-SSE.B.3c"],
      },
      {
        slug: "linear-or-exponential",
        title:
          "Linear or exponential: equal differences versus equal factors, and why exponential growth eventually wins",
        nys: ["AI-F.LE.1", "AI-F.LE.1a", "AI-F.LE.1b", "AI-F.LE.1c", "AI-F.LE.3"],
        ccss: ["HSF-LE.A.1a", "HSF-LE.A.1b", "HSF-LE.A.1c", "HSF-LE.A.3"],
      },
      {
        slug: "writing-exponential-functions",
        title: "Writing exponential functions and geometric sequences from a context",
        nys: ["AI-F.LE.2", "AI-F.BF.1", "AI-F.BF.1a"],
        ccss: ["HSF-LE.A.2", "HSF-BF.A.1", "HSF-BF.A.1a"],
      },
      {
        slug: "graphing-exponential-functions",
        title: "Graphing exponential functions and interpreting their parameters",
        nys: ["AI-F.IF.7a", "AI-F.LE.5"],
        ccss: ["HSF-IF.C.7a", "HSF-LE.B.5"],
      },
    ],
  },
  {
    slug: "polynomials-and-factoring",
    title: "Polynomials and factoring",
    summary: "Polynomial arithmetic and the factoring moves that quadratics depend on.",
    sessions: 12,
    concepts: [
      {
        slug: "polynomial-arithmetic",
        title: "Adding, subtracting, and multiplying polynomials",
        nys: ["AI-A.APR.1"],
        ccss: ["HSA-APR.A.1"],
      },
      {
        slug: "greatest-common-factor",
        title: "Factoring out a greatest common factor",
        nys: ["AI-A.SSE.2"],
        ccss: ["HSA-SSE.A.2"],
      },
      {
        slug: "factoring-trinomials",
        title: "Factoring trinomials with leading coefficient 1",
        nys: ["AI-A.SSE.2"],
        ccss: ["HSA-SSE.A.2"],
      },
      {
        slug: "difference-of-squares",
        title: "Difference of two squares and factoring completely",
        nys: ["AI-A.SSE.2"],
        ccss: ["HSA-SSE.A.2"],
      },
    ],
  },
  {
    slug: "quadratics",
    title: "Quadratic functions and equations",
    summary: "Solving, graphing, and comparing quadratics, then setting functions equal.",
    sessions: 22,
    concepts: [
      {
        slug: "zeros-from-factors",
        title: "Zeros of a polynomial from its factors, including given cubic factors",
        nys: ["AI-A.APR.3"],
        ccss: ["HSA-APR.B.3"],
      },
      {
        slug: "solving-by-factoring",
        title: "Solving quadratics by inspection, square roots, and factoring",
        nys: ["AI-A.REI.4", "AI-A.REI.4b"],
        ccss: ["HSA-REI.B.4", "HSA-REI.B.4b"],
      },
      {
        slug: "completing-the-square",
        title: "Completing the square",
        nys: ["AI-A.REI.4a"],
        ccss: ["HSA-REI.B.4a"],
      },
      {
        slug: "quadratic-formula",
        title: "The quadratic formula, the discriminant, and simplest radical form",
        nys: ["AI-A.REI.4a", "AI-A.REI.4b"],
        ccss: ["HSA-REI.B.4a", "HSA-REI.B.4b"],
      },
      {
        slug: "graphing-quadratics",
        title: "Graphing quadratics: vertex, axis of symmetry, zeros, maximum and minimum",
        nys: ["AI-F.IF.7a", "AI-F.IF.8", "AI-F.IF.8a"],
        ccss: ["HSF-IF.C.7a", "HSF-IF.C.8", "HSF-IF.C.8a"],
      },
      {
        slug: "comparing-functions",
        title: "Comparing two functions given in different forms",
        nys: ["AI-F.IF.9"],
        ccss: ["HSF-IF.C.9"],
      },
      {
        slug: "linear-quadratic-systems",
        title: "Linear-quadratic systems, algebraically and graphically",
        nys: ["AI-A.REI.7a"],
        ccss: ["HSA-REI.C.7"],
      },
      {
        slug: "solving-f-equals-g",
        title: "Solving f(x) = g(x) with graphs and tables",
        nys: ["AI-A.REI.11"],
        ccss: ["HSA-REI.D.11"],
      },
    ],
  },
  {
    slug: "statistics",
    title: "Statistics",
    summary: "Summarizing one variable, then relating two.",
    sessions: 11,
    concepts: [
      {
        slug: "dot-plots-histograms-box-plots",
        title: "Dot plots, histograms, and box plots",
        nys: ["AI-S.ID.1"],
        ccss: ["HSS-ID.A.1"],
      },
      {
        slug: "center-and-spread",
        title: "Center, spread, and outliers, including sample standard deviation",
        nys: ["AI-S.ID.2", "AI-S.ID.3"],
        ccss: ["HSS-ID.A.2", "HSS-ID.A.3"],
      },
      {
        slug: "two-way-tables",
        title: "Two-way frequency tables and relative frequencies",
        nys: ["AI-S.ID.5"],
        ccss: ["HSS-ID.B.5"],
      },
      {
        slug: "scatter-plots-and-regression",
        title: "Scatter plots and fitting a linear model with regression",
        nys: ["AI-S.ID.6", "AI-S.ID.6a"],
        ccss: ["HSS-ID.B.6", "HSS-ID.B.6a"],
      },
      {
        slug: "interpreting-linear-models",
        title: "Interpreting the slope and intercept of a linear model",
        nys: ["AI-S.ID.7"],
        ccss: ["HSS-ID.C.7"],
      },
      {
        slug: "correlation",
        title: "The correlation coefficient, and correlation versus causation",
        nys: ["AI-S.ID.8", "AI-S.ID.9"],
        ccss: ["HSS-ID.C.8", "HSS-ID.C.9"],
      },
    ],
  },
];

/** The whole course in order. Everything that needs units or concepts reads this. */
export const ALGEBRA1_COURSE: readonly CourseUnit[] = UNITS.map((unit, index) => ({
  number: index + 1,
  slug: unit.slug,
  title: unit.title,
  summary: unit.summary,
  sessions: unit.sessions,
  concepts: unit.concepts.map(({ slug, title, nys, ccss }) => {
    const key = conceptKey(unit.slug, slug);
    return { key, title, nys, ccss, playable: key === S1_KEY };
  }),
}));

/** How the course is named on the map, the breadcrumb and the parent view. */
export const ALGEBRA1_TITLE = "Algebra I";
