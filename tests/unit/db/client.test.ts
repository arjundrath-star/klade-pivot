import { sql } from "drizzle-orm";
import { expect, it } from "vitest";
import { getDb } from "@/db/client";
import { withTempDatabase } from "../../helpers/database";

withTempDatabase("klade-client-", new Date());

it("opens a local file in write-ahead mode with a busy timeout, so processes can share it", async () => {
  const db = await getDb();
  expect(await db.all(sql`PRAGMA journal_mode`)).toEqual([{ journal_mode: "wal" }]);
  expect(await db.all(sql`PRAGMA busy_timeout`)).toEqual([{ timeout: 5000 }]);
});
