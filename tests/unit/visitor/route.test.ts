import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { describe, expect, it } from "vitest";
import { GET } from "@/app/demo/route";
import { getDb } from "@/db/client";
import { DEMO_STUDENT_ID, resetDemoData } from "@/db/demo";
import { getStudent } from "@/db/queries/students";
import { families } from "@/db/schema";
import { createVisitor, VISITOR_TTL_MS } from "@/db/visitors";
import { GATE_COOKIE } from "@/gate/token";
import { SWEEP_INTERVAL_MS, sweepVisitors } from "@/visitor/sweep";
import { actAs, redirectOf, signIn, withTempDatabase } from "../../helpers/database";

const NOW = new Date("2026-10-02T16:00:00Z");

withTempDatabase("klade-demo-route-", NOW);

function demo(next?: string): Request {
  const query = next === undefined ? "" : `?next=${encodeURIComponent(next)}`;
  return new Request(`http://localhost:3000/demo${query}`);
}

/** A browser that is nobody but the id the proxy minted for it. */
async function arrive(studentId = randomUUID()): Promise<string> {
  await actAs(studentId);
  return studentId;
}

describe("/demo", () => {
  it("makes the cookie's id a copy of the demo and sends the browser on to next", async () => {
    await resetDemoData(NOW);
    const studentId = await arrive();
    expect(await redirectOf(() => GET(demo("/parent/settings?notice=saved")))).toBe(
      "/parent/settings?notice=saved",
    );
    expect(await getStudent(studentId)).toMatchObject({ name: "Maya", visitor: true });
    expect(await getStudent(DEMO_STUDENT_ID)).toMatchObject({ visitor: false });
  });

  it("falls back to the student's home for a next it will not follow, and makes the copy once", async () => {
    const studentId = await arrive();
    expect(await redirectOf(() => GET(demo("https://evil.example/student")))).toBe("/student");
    const { familyId } = (await getStudent(studentId)) ?? {};
    expect(await redirectOf(() => GET(demo()))).toBe("/student");
    expect((await getStudent(studentId))?.familyId).toBe(familyId);
  });

  it("sends a browser signed in at the gate on without a copy", async () => {
    await signIn();
    const db = await getDb();
    const copies = () =>
      db.select({ id: families.id }).from(families).where(eq(families.visitor, true));
    const before = await copies();
    expect(await redirectOf(() => GET(demo("/student")))).toBe("/student");
    expect(await copies()).toEqual(before);
  });

  it("tells a browser that kept no cookie to allow them, instead of sending it round again", async () => {
    const jar = await cookies();
    jar.delete(GATE_COOKIE);
    const response = await GET(demo("/student"));
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/html");
    expect(response.headers.get("content-security-policy")).toContain("default-src 'none'");
    expect(await response.text()).toContain("The demo needs cookies");
  });

  it("sweeps stale copies at most once an hour", async () => {
    // The requests above swept on the real clock; this one runs an hour on from it.
    const first = new Date(Date.now() + SWEEP_INTERVAL_MS);
    const at = (offsetMs: number) => new Date(first.getTime() + offsetMs);
    const stale = randomUUID();
    await createVisitor(stale, at(-VISITOR_TTL_MS - 1000));
    expect(await sweepVisitors(first)).toBe(1);
    expect(await getStudent(stale)).toBeUndefined();
    await createVisitor(stale, at(-VISITOR_TTL_MS - 1000));
    expect(await sweepVisitors(at(SWEEP_INTERVAL_MS - 1))).toBeNull();
    expect(await getStudent(stale)).toBeDefined();
    expect(await sweepVisitors(at(SWEEP_INTERVAL_MS))).toBe(1);
    expect(await getStudent(stale)).toBeUndefined();
  });
});
