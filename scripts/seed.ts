// Seeds the demo family and curriculum into the database at DATABASE_URL (npm run db:seed).
// --fresh (npm run db:reset) first deletes the local database file, so smoke and Lighthouse runs
// start from a known state. --open-session also opens Maya's session for today and prints its path.
import { existsSync } from "node:fs";
import { deleteLocalDatabase } from "@/db/client";
import { DEMO_STUDENT_ID, seedDemo } from "@/db/demo";
import { openTodaySession } from "@/db/queries/sessions";

// Read the same DATABASE_URL `next dev` reads. Variables already set in the shell win.
if (existsSync(".env.local")) process.loadEnvFile(".env.local");

async function main(): Promise<void> {
  if (process.argv.includes("--fresh")) deleteLocalDatabase();
  await seedDemo();
  console.log("seeded the demo family and curriculum");
  if (process.argv.includes("--open-session")) {
    const sessionId = await openTodaySession(DEMO_STUDENT_ID, 1);
    if (sessionId === null) throw new Error("Maya has no session left to open");
    console.log(`/student/session/${sessionId}`);
  }
}

void main();
