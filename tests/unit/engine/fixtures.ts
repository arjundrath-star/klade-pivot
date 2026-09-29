import { defineTemplate } from "@/engine/template";

// One example template per structure. Real curriculum lives in src/content/.

export const twoStepWord = defineTemplate({
  key: "fixture-two-step-word",
  structure: "two-step",
  ranges: { a: { min: 2, max: 6 }, b: { min: 4, max: 20 }, x: { min: 4, max: 15 } },
  kind: "word",
  variants: {
    sports:
      "You scored {b} points in your first basketball game. Then you scored an equal number of points in each of your next {a} games and finished with {c} points in all. How many points did you score in each of those {a} games?",
    music:
      "Your playlist has {b} songs. You add the same number of songs from each of {a} albums and end up with {c} songs. How many songs did you add from each album?",
    gaming:
      "You start with {b} gems. You earn an equal number of gems in each of the next {a} levels and finish with {c} gems. How many gems did you earn per level?",
    food: "You baked {b} cookies on Monday. Then you baked an equal number of cookies on each of the next {a} days, for {c} cookies in all. How many did you bake on each of those {a} days?",
    creators:
      "Your video had {b} comments when you posted it. It got the same number of new comments each hour for {a} hours and ended with {c}. How many new comments came in each hour?",
    animals:
      "A shelter had {b} cats. The same number of cats arrived in each of the next {a} weeks, and then the shelter had {c} cats. How many cats arrived each week?",
    neutral:
      "A tank holds {b} liters of water. It fills by the same amount each minute for {a} minutes and ends up holding {c} liters. How many liters did it fill each minute?",
  },
});

export const bothSidesWord = defineTemplate({
  key: "fixture-both-sides-word",
  structure: "both-sides",
  ranges: {
    a: { min: 4, max: 9 },
    b: { min: 2, max: 20 },
    c: { min: 1, max: 3 },
    x: { min: 2, max: 12 },
  },
  kind: "word",
  variants: {
    sports:
      "You have {b} points this season and score {a} points per game. Your teammate has {d} points and scores {c} per game. After how many games will you be tied?",
    music:
      "You have {b} songs saved and save {a} new songs each week. Your friend has {d} songs saved and saves {c} each week. After how many weeks will you have the same number?",
    gaming:
      "You have {b} coins and earn {a} coins per level. Your friend has {d} coins and earns {c} per level. After how many levels will you have the same number of coins?",
    food: "Your bake sale table has {b} cupcakes and you frost {a} more each hour. Your friend's table has {d} cupcakes and they frost {c} each hour. After how many hours will the tables have the same number?",
    creators:
      "Your channel has {b} videos and you post {a} new videos each month. Your friend's channel has {d} videos and posts {c} each month. After how many months will the channels have the same number of videos?",
    animals:
      "Your aquarium has {b} fish and you add {a} each week. Your friend's aquarium has {d} fish and they add {c} each week. After how many weeks will the aquariums have the same number of fish?",
    neutral:
      "Tank A holds {b} liters and fills at {a} liters per minute. Tank B holds {d} liters and fills at {c} liters per minute. After how many minutes will they hold the same amount?",
  },
});

export const distributionSymbolic = defineTemplate({
  key: "fixture-distribution-symbolic",
  structure: "distribution",
  ranges: {
    a: { min: 2, max: 5 },
    b: { min: -6, max: 6 },
    c: { min: -4, max: 4 },
    x: { min: -10, max: 10 },
  },
  kind: "symbolic",
  variants: { neutral: "Solve for x." },
});

export const FIXTURES = [twoStepWord, bothSidesWord, distributionSymbolic] as const;
