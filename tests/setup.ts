import { beforeEach, vi } from "vitest";
import { freshGateToken, GATE_COOKIE } from "@/gate/token";

// Unit tests call server actions and route handlers outside a request, so next/headers gets a
// cookie jar of its own. It starts over for every test as a browser that never onboarded (so it
// acts as the demo student) and has signed in at the gate, so the parent and admin actions run.
const jar = new Map<string, string>();

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => (jar.has(name) ? { name, value: jar.get(name) } : undefined),
    set: (name: string, value: string) => void jar.set(name, value),
    delete: (name: string) => void jar.delete(name),
  }),
}));

/** The gate password every unit test's server has. Tests of the gate itself stub their own. */
export const TEST_ADMIN_PASSWORD = "unit-test-gate";

process.env.ADMIN_PASSWORD = TEST_ADMIN_PASSWORD;

beforeEach(() => {
  jar.clear();
  jar.set(GATE_COOKIE, freshGateToken(TEST_ADMIN_PASSWORD));
});
