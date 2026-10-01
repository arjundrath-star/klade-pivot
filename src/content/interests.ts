import type { Interest } from "@/engine/types";

/** How each interest tag reads to a student (spec §3.1). */
export const INTEREST_LABELS: Readonly<Record<Interest, string>> = {
  sports: "Sports",
  music: "Music",
  gaming: "Gaming",
  food: "Food & cooking",
  creators: "Creators & social media",
  animals: "Animals",
};

/**
 * The optional follow-up to each interest ("favorite sport"). A fixed list rather than a text box:
 * the student profile holds no free text beyond a first name.
 */
export const FAVORITES: Readonly<Record<Interest, readonly string[]>> = {
  sports: ["Basketball", "Soccer", "Baseball", "Football", "Volleyball", "Swimming", "Track"],
  music: ["Pop", "Hip-hop", "Rock", "Country", "K-pop", "Latin", "Classical"],
  gaming: ["Building games", "Racing games", "Sports games", "Puzzle games", "Adventure games"],
  food: ["Baking", "Cooking meals", "Desserts", "Trying new foods"],
  creators: ["Short videos", "Streaming", "Photography", "Drawing and design"],
  animals: ["Dogs", "Cats", "Horses", "Ocean animals", "Wild animals", "Reptiles"],
};
