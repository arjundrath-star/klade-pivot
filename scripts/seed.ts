// Seeds the demo family and curriculum into the database at DATABASE_URL (npm run db:seed).
// --fresh (npm run db:reset) first deletes the local database file, so smoke and Lighthouse runs
// start from a known state. --demo puts the database in the state the demo starts from (every
// family and all history gone, today on Maya's schedule, her phone rule on), the same as the admin
// panel's "Reset demo". --open-session also opens Maya's session for today and prints its path.
import { existsSync } from "node:fs";
import { deleteLocalDatabase } from "@/db/client";
import { DEMO_STUDENT_ID, resetDemoData, seedDemo, sessionSeedFor } from "@/db/demo";
import { openTodaySession } from "@/db/queries/sessions";

// Read the same DATABASE_URL `next dev` reads. Variables already set in the shell win.
if (existsSync(".env.local")) process.loadEnvFile(".env.local");

async function main(): Promise<void> {
  const flags = new Set(process.argv.slice(2));
  if (flags.has("--fresh")) deleteLocalDatabase();
  if (flags.has("--demo")) {
    await resetDemoData();
    console.log("reset to the demo's starting state");
  } else {
    await seedDemo();
    console.log("seeded the demo family and curriculum");
  }
  if (flags.has("--open-session")) {
    const sessionId = await openTodaySession(DEMO_STUDENT_ID, sessionSeedFor(DEMO_STUDENT_ID));
    if (sessionId === null) throw new Error("Maya has no session left to open");
    console.log(`/student/session/${sessionId}`);
  }
}

void main();
