import { defineTemplate } from "@/engine/template";

// Session 1's problem templates (HSA-REI.B.3, two-step equations). Word-problem ranges are sized
// so every variant stays realistic for every value they can draw; tests/unit/content/s1.test.ts
// pins those limits. Symbolic problems take negative numbers, which is where the integer-operations
// practice lives. The session is assembled in s1.ts; the chapter cuts its worked examples from
// these same templates in s1-chapter.ts.

export const SOLVE = { kind: "symbolic", variants: { neutral: "Solve for x." } } as const;

// Warm-up: one-step equations with negative numbers, the prerequisites for two-step solving.

export const warmupAdd = defineTemplate({
  key: "s1-warmup-add",
  structure: "one-step",
  form: "add",
  ranges: { b: { min: -20, max: 20 }, x: { min: -20, max: 20 } },
  ...SOLVE,
});

export const warmupMultiply = defineTemplate({
  key: "s1-warmup-multiply",
  structure: "one-step",
  form: "multiply",
  ranges: { a: { min: 2, max: 12 }, x: { min: -10, max: 10 } },
  ...SOLVE,
});

export const warmupMultiplyNegative = defineTemplate({
  key: "s1-warmup-multiply-negative",
  structure: "one-step",
  form: "multiply",
  ranges: { a: { min: -9, max: -2 }, x: { min: -10, max: 10 } },
  ...SOLVE,
});

// Guided practice.

export const twoStep = defineTemplate({
  key: "s1-two-step",
  structure: "two-step",
  ranges: { a: { min: 2, max: 9 }, b: { min: -20, max: 20 }, x: { min: 1, max: 12 } },
  ...SOLVE,
});

export const addEqualGroups = defineTemplate({
  key: "s1-add-equal-groups",
  structure: "two-step",
  // Groups of 4 to 8: songs on an EP, pizza slices per family, cats per rescue group.
  ranges: { a: { min: 2, max: 4 }, b: { min: 4, max: 12 }, x: { min: 4, max: 8 } },
  kind: "word",
  variants: {
    sports:
      "Your soccer coach set out {b} cones before practice. Then the coach added {a} rows of cones, with the same number of cones in each row. Now there are {c} cones on the field. How many cones are in each row?",
    music:
      "Your playlist has {b} songs. You add every song from {a} new EPs, and each EP has the same number of songs. Now your playlist has {c} songs. How many songs are on each EP?",
    gaming:
      "You have {b} coins in a game. You beat {a} levels and earn the same number of coins on each level. Now you have {c} coins. How many coins did you earn on each level?",
    food: "A pizza place sold {b} slices this morning. This afternoon, {a} families each ordered the same number of slices. The place has now sold {c} slices today. How many slices did each family order?",
    creators:
      "Your latest video had {b} comments. Over the next {a} hours, it got the same number of new comments each hour. Now it has {c} comments. How many new comments did it get each hour?",
    animals:
      "An animal shelter had {b} cats. Then {a} rescue groups each brought in the same number of cats. Now the shelter has {c} cats. How many cats did each group bring?",
    neutral:
      "A shelf holds {b} books. You add {a} boxes of books, with the same number of books in each box. Now the shelf holds {c} books. How many books were in each box?",
  },
});

export const growByRate = defineTemplate({
  key: "s1-grow-by-rate",
  structure: "two-step",
  // Gains of 2 to 5 a week or a month keep a puppy under 65 pounds and a juggling record believable.
  ranges: { a: { min: 2, max: 5 }, b: { min: 5, max: 20 }, x: { min: 3, max: 9 } },
  kind: "word",
  variants: {
    sports:
      "You can juggle a soccer ball {b} times in a row. Every week you practice, your record goes up by {a}. How many weeks will it take to reach {c} juggles in a row?",
    music:
      "Your band's page has {b} followers. After every show, {a} new people follow it. How many shows will it take to reach {c} followers?",
    gaming:
      "Your character is at level {b}. Each day you play, you go up {a} levels. How many days will it take to reach level {c}?",
    food: "Before lunch, a food truck has {b} tacos ready. The cook makes {a} more tacos every minute. In how many minutes will {c} tacos be ready?",
    creators:
      "Your channel has {b} videos. You post {a} new videos every week. How many weeks until your channel has {c} videos?",
    animals:
      "A puppy weighs {b} pounds. It gains {a} pounds every month. How many months until it weighs {c} pounds?",
    neutral:
      "A plant is {b} centimeters tall. It grows {a} centimeters every week. How many weeks until it is {c} centimeters tall?",
  },
});

export const negativeCoefficient = defineTemplate({
  key: "s1-two-step-negative",
  structure: "two-step",
  ranges: { a: { min: -9, max: -2 }, b: { min: -20, max: 20 }, x: { min: -10, max: 10 } },
  ...SOLVE,
});

export const itemsPlusFee = defineTemplate({
  key: "s1-items-plus-fee",
  structure: "two-step",
  // Prices of $3 to $12 fit socks, guitar strings, a smoothie and a bag of treats alike.
  ranges: { a: { min: 2, max: 5 }, b: { min: 3, max: 9 }, x: { min: 3, max: 12 } },
  kind: "word",
  variants: {
    sports:
      "You buy {a} pairs of soccer socks and a water bottle that costs ${b}. You pay ${c} in all. Each pair of socks costs the same. How many dollars is one pair?",
    music:
      "You buy {a} packs of guitar strings and a tuner that costs ${b}. You pay ${c} in all. Each pack of strings costs the same. How many dollars is one pack?",
    gaming:
      "You buy {a} skins in a game's shop and a battle pass that costs ${b}. You spend ${c} in all. Each skin costs the same. How many dollars is one skin?",
    food: "You order {a} smoothies for your friends and pay a ${b} delivery fee. The total is ${c}. Each smoothie costs the same. How many dollars is one smoothie?",
    creators:
      "You order {a} packs of stickers with your channel's logo and pay ${b} for shipping. The total is ${c}. Each pack costs the same. How many dollars is one pack?",
    animals:
      "You buy {a} bags of dog treats and a chew toy that costs ${b}. You pay ${c} in all. Each bag of treats costs the same. How many dollars is one bag?",
    neutral:
      "You buy {a} notebooks and a pack of pens that costs ${b}. You pay ${c} in all. Each notebook costs the same. How many dollars is one notebook?",
  },
});

// Exit check: new templates only, so the check measures the skill, not memory of a problem.

export const exitTwoStep = defineTemplate({
  key: "s1-exit-two-step",
  structure: "two-step",
  ranges: { a: { min: 2, max: 9 }, b: { min: -20, max: 20 }, x: { min: -10, max: 10 } },
  ...SOLVE,
});

export const shareWithLeftover = defineTemplate({
  key: "s1-share-with-leftover",
  structure: "two-step",
  // Shares of 4 to 10 fit a team's pinnies, a row of music stands and a box of cookies. The {b}
  // left are kept on purpose in every story, so leftovers that could be shared out still read right.
  ranges: { a: { min: 2, max: 5 }, b: { min: 2, max: 9 }, x: { min: 4, max: 10 } },
  kind: "word",
  variants: {
    sports:
      "Your soccer coach has {c} pinnies. The coach keeps {b} as spares and gives each of {a} teams the same number of the rest. How many pinnies does each team get?",
    music:
      "Your school band has {c} music stands. The director sets up {a} rows with the same number of stands in each row, and {b} stands stay in the closet. How many stands are in each row?",
    gaming:
      "You have {c} gems. You buy {a} upgrades that each cost the same number of gems, and you save the other {b} gems for later. How many gems does each upgrade cost?",
    food: "You baked {c} cookies. You pack the same number of cookies into each of {a} gift boxes, and {b} cookies are left for your family. How many cookies are in each box?",
    creators:
      "You filmed {c} short clips. You use the same number of clips in each of {a} videos, and {b} clips don't make it into any video. How many clips are in each video?",
    animals:
      "A dog walker has {c} treats and saves {b} of them for tomorrow. Each of the {a} dogs on today's walk gets the same number of the rest. How many treats does each dog get?",
    neutral:
      "A teacher has {c} pencils. The teacher keeps {b} in a drawer and gives each of {a} tables the same number of the rest. How many pencils does each table get?",
  },
});

export const saveTowardGoal = defineTemplate({
  key: "s1-save-toward-goal",
  structure: "two-step",
  // Goals of $35 to $120 at $5 to $10 a week: real prices for cleats, headphones or a microphone.
  ranges: { a: { min: 5, max: 10 }, b: { min: 20, max: 40 }, x: { min: 3, max: 8 } },
  kind: "word",
  variants: {
    sports:
      "You have ${b} saved for new soccer cleats that cost ${c}. You save ${a} every week. How many weeks until you have exactly enough?",
    music:
      "You have ${b} saved for headphones that cost ${c}. You save ${a} every week. How many weeks until you have exactly enough?",
    gaming:
      "You have ${b} saved for a new controller that costs ${c}. You save ${a} every week. How many weeks until you have exactly enough?",
    food: "You have ${b} saved for an air fryer that costs ${c}. You save ${a} every week. How many weeks until you have exactly enough?",
    creators:
      "You have ${b} saved for a microphone that costs ${c}. You save ${a} every week. How many weeks until you have exactly enough?",
    animals:
      "You have ${b} saved for a fish tank that costs ${c}. You save ${a} every week. How many weeks until you have exactly enough?",
    neutral:
      "You have ${b} saved for a jacket that costs ${c}. You save ${a} every week. How many weeks until you have exactly enough?",
  },
});
