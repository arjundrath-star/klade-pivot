import path from "node:path";
import type { LibSQLDatabase } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";

const MIGRATIONS_FOLDER = path.join(process.cwd(), "drizzle");

/**
 * Local file databases (dev, CI, tests) migrate on first connection, so a fresh clone needs no
 * setup. A hosted database is migrated once per deploy with `npm run db:migrate`.
 */
export function migratesOnConnect(url: string): boolean {
  return url.startsWith("file:");
}

export async function applyMigrations(db: LibSQLDatabase): Promise<void> {
  await migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
}
