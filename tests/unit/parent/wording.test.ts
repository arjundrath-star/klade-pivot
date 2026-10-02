import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// Decision D31: parent-facing text says what the kid can explain. A rubric grade is evidence, not
// verification, so these words never reach a parent.
const BANNED = /\b(prove[sdn]?|proving|proof|verified)\b/gi;

const PARENT_FACING = [
  "src/app/parent",
  "src/parent",
  "src/app/layout.tsx",
  "src/app/page.tsx",
  // The prototype's rewards and mentor cards render on the parent view too.
  "src/content/rewards.ts",
  "src/rewards",
  "src/mentor",
  // The course map renders on the parent view too.
  "src/course",
];

function files(target: string): string[] {
  if (!statSync(target).isDirectory()) return [target];
  return readdirSync(target).flatMap((entry) => files(path.join(target, entry)));
}

describe("parent-facing wording", () => {
  const sources = PARENT_FACING.flatMap(files);

  it("scans the parent pages, the alert copy, the layout and the home page", () => {
    expect(sources).toContain(path.join("src/app/parent", "page.tsx"));
    expect(sources).toContain(path.join("src/parent", "alerts.ts"));
    expect(sources).toContain("src/app/layout.tsx");
  });

  it.each(PARENT_FACING.flatMap(files))("%s never says prove, proof or verified", (file) => {
    expect(readFileSync(file, "utf8").match(BANNED) ?? []).toEqual([]);
  });

  it("catches the words it bans, and not words that only contain them", () => {
    expect("It proves it. Proof. Verified.".match(BANNED)).toHaveLength(3);
    expect("We improve and approve.".match(BANNED)).toBeNull();
  });
});
