import { mkdirSync, rmSync } from "node:fs";
import path from "node:path";
import { createClient } from "@libsql/client";
import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";
import { applyMigrations, migratesOnConnect } from "@/db/migrate";

function databaseUrl(): string {
  return process.env.DATABASE_URL ?? "file:./data/dev.db";
}

/** The file path in a `file:` URL: `file:./data/dev.db`, `file:///abs/dev.db`, with or without a query. */
function localPath(url: string): string {
  const [target] = url.slice("file:".length).split("?");
  return target.startsWith("//") ? target.slice(2) : target;
}

/**
 * How long a statement waits for another process's write lock before failing. The seed script,
 * the smoke tests and "Reset demo" all write the file the server is reading.
 */
const BUSY_TIMEOUT_MS = 5000;

async function open(url: string, authToken: string | undefined): Promise<LibSQLDatabase> {
  const local = migratesOnConnect(url);
  // libSQL creates the database file but not its directory, which a fresh clone lacks.
  if (local) mkdirSync(path.dirname(localPath(url)), { recursive: true });
  const client = createClient({ url, authToken });
  if (local) {
    // Write-ahead logging lets readers go on while another process writes, and a writer that
    // finds the file locked waits instead of failing with SQLITE_BUSY.
    await client.execute("PRAGMA journal_mode = WAL");
    await client.execute(`PRAGMA busy_timeout = ${BUSY_TIMEOUT_MS}`);
  }
  const db = drizzle(client);
  if (local) await applyMigrations(db);
  return db;
}

let connection: Promise<LibSQLDatabase> | undefined;

/** The database at `DATABASE_URL`, opened (and migrated, when local) once per process. */
export function getDb(): Promise<LibSQLDatabase> {
  connection ??= open(databaseUrl(), process.env.DATABASE_AUTH_TOKEN || undefined).catch(
    (error: unknown) => {
      // Let the next request retry instead of caching the failure for the life of the process.
      connection = undefined;
      throw error;
    },
  );
  return connection;
}

/**
 * Deletes the local database file at `DATABASE_URL` so the next connection starts from an empty,
 * freshly migrated database. Refuses a hosted database.
 */
export function deleteLocalDatabase(): void {
  const url = databaseUrl();
  if (!migratesOnConnect(url)) throw new Error("Refusing to delete a hosted database");
  for (const suffix of ["", "-journal", "-wal", "-shm"]) {
    rmSync(localPath(url) + suffix, { force: true });
  }
}
