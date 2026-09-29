import { existsSync } from "node:fs";
import { defineConfig } from "drizzle-kit";

// Read the same DATABASE_URL `next dev` reads. Variables already set in the shell win.
if (existsSync(".env.local")) process.loadEnvFile(".env.local");

export default defineConfig({
  dialect: "turso",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "file:./data/dev.db",
    authToken: process.env.DATABASE_AUTH_TOKEN,
  },
});
