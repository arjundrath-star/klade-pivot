# Algebra I course outline

A unit-by-unit map of the New York State Regents Algebra I course, for display as the product's course map. Every concept carries its New York State Next Generation code and the Common Core State Standards (CCSS) code it corresponds to.

## Sources

All accessed 2026-10-02.

1. **New York State Next Generation Mathematics Learning Standards, Algebra I Crosswalk.** New York State Education Department (NYSED). Primary source for every `AI-` code and its wording. Each page carries the footer "NYSED Algebra I Draft". https://www.nysed.gov/sites/default/files/programs/curriculum-instruction/nys-math-standards-algebra-i-crosswalk.pdf
2. **New York State Testing Program Educator Guide to the Regents Examination in Algebra I, Next Generation Mathematics Learning Standards.** NYSED, updated October 2023. Source for the exam blueprint and for the cluster letters (for example A-REI.B) that turn each NYS code into its CCSS identifier. https://www.nysed.gov/sites/default/files/programs/state-assessment/algebra-one-educator-guide-2023.pdf
3. **Next Generation Mathematics Learning Standards: Suggested Breakdown of Instructional Time.** NYSED. States that curriculum and units of study are locally determined by districts, and that Algebra I moved to the new standards in 2023-2024. https://www.nysed.gov/sites/default/files/programs/standards-instruction/next-generation-mathematics-learning-standards-suggested-breakdown-of-instructional-time.pdf
4. **New York State Next Generation Mathematics Learning Standards, Grade 7 and Grade 8 Crosswalks.** NYSED. Used only for the pre-Algebra-I note on two-step equations. https://www.nysed.gov/sites/default/files/programs/curriculum-instruction/nys-math-standards-grade-7-crosswalk.pdf and https://www.nysed.gov/sites/default/files/programs/curriculum-instruction/nys-math-standards-grade-8-crosswalk.pdf
5. **Common Core State Standards for Mathematics, High School.** NGA Center and CCSSO. https://www.thecorestandards.org/Math/Content/HSA/REI/ (the site returned HTTP 403 to automated fetches; identifier format, for example CCSS.Math.Content.HSA-REI.B.3, confirmed through search results that index it, such as https://www.shmoop.com/common-core-standards/ccss-hs-a-rei-3.html).

## Retrieval notes

- nysed.gov serves an incomplete TLS certificate chain, so the web fetch tool refused it. The PDFs above were downloaded directly and read in full as text. Every `AI-` code below appears verbatim in source 1, and every cluster appears in the source 2 blueprint chart.
- CCSS codes are built from the NYS code plus the cluster letter NYSED prints in source 2 (for example, A-REI.3 sits in cluster A-REI.B, so AI-A.REI.3 corresponds to HSA-REI.B.3).
- Where NYS added a letter that CCSS lacks (AI-N.RN.3a and 3b, AI-A.REI.1a, AI-A.REI.6a, AI-A.REI.7a, AI-F.BF.3a), the CCSS code given is the parent standard, marked "parent".
- No code in this file is marked [unconfirmed]. All were confirmed against sources 1 and 2.

## Unit groupings: whose they are

NYSED publishes standards, clusters, and an exam blueprint. It does not publish an official unit sequence: source 3 says curriculum and units of study "are locally determined by each individual district." **The unit groupings and teaching order below are the author's organization of the NYSED standards**, following the common Regents Algebra I sequence (linear first, then exponential, then quadratic, statistics last).

## Exam weighting (Regents Algebra I blueprint, source 2)

| Conceptual category | Share of test credits | Units here |
|---|---|---|
| Number and Quantity (N-RN, N-Q) | 4% to 10% | 1 |
| Algebra (A-SSE, A-APR, A-CED, A-REI) | 48% to 61% | 1, 2, 5, 7, 8 |
| Functions (F-IF, F-BF, F-LE) | 24% to 32% | 3, 4, 6, 8 |
| Statistics and Probability (S-ID) | 7% to 15% | 9 |

Code format below: NYS code / CCSS code.

## Unit 1. Numbers, quantities, and expressions

Working with units, rational and irrational numbers, and reading the parts of an expression.

1. Units and precision in multi-step problems. AI-N.Q.1, AI-N.Q.3 / HSN-Q.A.1, HSN-Q.A.3
2. Operations with rational numbers and square roots, including rationalizing numerical denominators. AI-N.RN.3a / HSN-RN.B.3 (parent)
3. Sums and products of rational and irrational numbers. AI-N.RN.3b / HSN-RN.B.3 (parent)
4. Parts of an expression, polynomial standard form, and reading expressions in context. AI-A.SSE.1, AI-A.SSE.1a, AI-A.SSE.1b / HSA-SSE.A.1, HSA-SSE.A.1a, HSA-SSE.A.1b

## Unit 2. Linear equations and inequalities in one variable

Solving for one unknown, justifying every step, and writing the equation from a situation.

1. Explaining each step of a solution as a reason. AI-A.REI.1a / HSA-REI.A.1 (parent)
2. Solving two-step linear equations. AI-A.REI.3 / HSA-REI.B.3 **(built; the only playable concept in the MVP)**
3. Equations with variables on both sides. AI-A.REI.3 / HSA-REI.B.3 **(planned S2, S3; cut from the MVP)**
4. Equations with distribution and like terms. AI-A.REI.3 / HSA-REI.B.3 **(planned S2, S3; cut from the MVP)**
5. Equations with letter coefficients and rearranging formulas. AI-A.REI.3, AI-A.CED.4 / HSA-REI.B.3, HSA-CED.A.4
6. Solving linear inequalities in one variable (no compound inequalities). AI-A.REI.3 / HSA-REI.B.3
7. Writing equations and inequalities in one variable from a context. AI-A.CED.1 / HSA-CED.A.1

Note on concepts 2 to 4: NYSED places fluency with px + q = r in grade 7 (NY-7.EE.4a) and variables on both sides plus distribution in grade 8 (NY-8.EE.7b). Algebra I reaches them through AI-A.REI.3. For a catching-up student these are the on-ramp; for an ahead student they are review.

## Unit 3. Functions

What a function is, how to name one, and how to read its graph or table.

1. Functions, domain, and range. AI-F.IF.1 / HSF-IF.A.1
2. Function notation and evaluating functions in context. AI-F.IF.2 / HSF-IF.A.2
3. A graph as the set of all solutions; domain from a graph and from a context. AI-A.REI.10, AI-F.IF.5 / HSA-REI.D.10, HSF-IF.B.5
4. Key features of graphs and tables: intercepts, increasing and decreasing, maximum and minimum. AI-F.IF.4 / HSF-IF.B.4
5. Average rate of change over an interval. AI-F.IF.6 / HSF-IF.B.6

## Unit 4. Linear functions

Slope, lines, sequences, and the first non-linear graphs built from lines.

1. Graphing linear functions and showing key features. AI-F.IF.7a / HSF-IF.C.7a
2. Writing a linear function from a graph, a description, or two points. AI-F.LE.2, AI-A.CED.2 / HSF-LE.A.2, HSA-CED.A.2
3. Interpreting slope and intercept in context. AI-F.LE.5 / HSF-LE.B.5
4. Arithmetic sequences as functions. AI-F.IF.3, AI-F.BF.1a / HSF-IF.A.3, HSF-BF.A.1a
5. Absolute value, step, piecewise, and square root functions. AI-F.IF.7b / HSF-IF.C.7b
6. Transformations: f(x) + k, k f(x), and f(x + k). AI-F.BF.3a / HSF-BF.B.3 (parent)

## Unit 5. Systems of equations and inequalities

Two unknowns, two conditions, and constraints from real situations.

1. Solving linear systems by graphing. AI-A.REI.6a / HSA-REI.C.6 (parent)
2. Solving linear systems by substitution. AI-A.REI.6a / HSA-REI.C.6 (parent)
3. Solving linear systems by elimination. AI-A.REI.6a / HSA-REI.C.6 (parent)
4. Graphing linear inequalities and systems of inequalities in two variables. AI-A.REI.12 / HSA-REI.D.12
5. Modeling constraints and judging viable solutions. AI-A.CED.3 / HSA-CED.A.3

## Unit 6. Exponential functions

Growth by equal factors, and why it beats growth by equal differences.

1. Rewriting exponential expressions with exponent properties. AI-A.SSE.3, AI-A.SSE.3c / HSA-SSE.B.3, HSA-SSE.B.3c
2. Linear or exponential: equal differences versus equal factors, and why exponential growth eventually wins. AI-F.LE.1, AI-F.LE.1a, AI-F.LE.1b, AI-F.LE.1c, AI-F.LE.3 / HSF-LE.A.1a, HSF-LE.A.1b, HSF-LE.A.1c, HSF-LE.A.3
3. Writing exponential functions and geometric sequences from a context. AI-F.LE.2, AI-F.BF.1, AI-F.BF.1a / HSF-LE.A.2, HSF-BF.A.1, HSF-BF.A.1a
4. Graphing exponential functions and interpreting their parameters. AI-F.IF.7a, AI-F.LE.5 / HSF-IF.C.7a, HSF-LE.B.5

## Unit 7. Polynomials and factoring

Polynomial arithmetic and the factoring moves that quadratics depend on.

1. Adding, subtracting, and multiplying polynomials. AI-A.APR.1 / HSA-APR.A.1
2. Factoring out a greatest common factor. AI-A.SSE.2 / HSA-SSE.A.2
3. Factoring trinomials with leading coefficient 1. AI-A.SSE.2 / HSA-SSE.A.2
4. Difference of two squares and factoring completely. AI-A.SSE.2 / HSA-SSE.A.2

## Unit 8. Quadratic functions and equations

Solving, graphing, and comparing quadratics, then setting functions equal.

1. Zeros of a polynomial from its factors, including given cubic factors. AI-A.APR.3 / HSA-APR.B.3
2. Solving quadratics by inspection, square roots, and factoring. AI-A.REI.4, AI-A.REI.4b / HSA-REI.B.4, HSA-REI.B.4b
3. Completing the square. AI-A.REI.4a / HSA-REI.B.4a
4. The quadratic formula, the discriminant, and simplest radical form. AI-A.REI.4a, AI-A.REI.4b / HSA-REI.B.4a, HSA-REI.B.4b
5. Graphing quadratics: vertex, axis of symmetry, zeros, maximum and minimum. AI-F.IF.7a, AI-F.IF.8, AI-F.IF.8a / HSF-IF.C.7a, HSF-IF.C.8, HSF-IF.C.8a
6. Comparing two functions given in different forms. AI-F.IF.9 / HSF-IF.C.9
7. Linear-quadratic systems, algebraically and graphically. AI-A.REI.7a / HSA-REI.C.7 (parent)
8. Solving f(x) = g(x) with graphs and tables. AI-A.REI.11 / HSA-REI.D.11

## Unit 9. Statistics

Summarizing one variable, then relating two.

1. Dot plots, histograms, and box plots. AI-S.ID.1 / HSS-ID.A.1
2. Center, spread, and outliers, including sample standard deviation. AI-S.ID.2, AI-S.ID.3 / HSS-ID.A.2, HSS-ID.A.3
3. Two-way frequency tables and relative frequencies. AI-S.ID.5 / HSS-ID.B.5
4. Scatter plots and fitting a linear model with regression. AI-S.ID.6, AI-S.ID.6a / HSS-ID.B.6, HSS-ID.B.6a
5. Interpreting the slope and intercept of a linear model. AI-S.ID.7 / HSS-ID.C.7
6. The correlation coefficient, and correlation versus causation. AI-S.ID.8, AI-S.ID.9 / HSS-ID.C.8, HSS-ID.C.9

## Coverage check

- 9 units, 49 concepts.
- Every Algebra I standard in source 2's blueprint chart appears at least once: N-RN.3(a,b), N-Q.1, N-Q.3, A-SSE.1(a,b), A-SSE.2, A-SSE.3(c), A-APR.1, A-APR.3, A-CED.1 to 4, A-REI.1a, A-REI.3, A-REI.4(a,b), A-REI.6a, A-REI.7a, A-REI.10 to 12, F-IF.1 to 6, F-IF.7(a,b), F-IF.8(a), F-IF.9, F-BF.1a, F-BF.3a, F-LE.1(a,b,c), F-LE.2, F-LE.3, F-LE.5, S-ID.1 to 3, S-ID.5, S-ID.6(a), S-ID.7 to 9.
- Standards NYSED removed from Algebra I (for example A-SSE.3a, A-SSE.3b, A-REI.5, S-ID.6b, N-Q.2) are left out on purpose.
- One concept is roughly one 30-minute session. That is an estimate, not a NYSED figure. Factoring, completing the square, and systems will likely need more than one session each for a catching-up student.

## How this maps to the product

- **Course map.** The map shows the 9 units in the order above, each expanded into its numbered concepts. Each concept shows its codes so a parent or teacher can match it to the school's syllabus.
- **Student position.** A student's position is the first concept, in course order, not yet mastered. Mastered concepts earlier in the list do not need to be contiguous for the map to render; position is always the earliest gap.
- **Levels.** One level per unit mastered. A unit counts as mastered when every concept in it is mastered. 9 units means 9 levels for the full course.
- **MVP state.** Only Unit 2, concept 2 (solving two-step linear equations) is playable. Every other concept renders on the map as not yet available. Concepts 3 and 4 of Unit 2 are the next two to build.
