import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ENGINE = join(process.cwd(), "src/engine");

describe("engine source", () => {
  it.each(readdirSync(ENGINE).filter((file) => file.endsWith(".ts")))(
    "%s has no floating-point tolerance comparisons",
    (file) => {
      expect(readFileSync(join(ENGINE, file), "utf8")).not.toMatch(/toFixed|Math\.abs|epsilon/i);
    },
  );
});
