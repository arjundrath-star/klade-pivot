import { beforeEach, vi } from "vitest";

// Unit tests call server actions and route handlers outside a request, so next/headers gets a
// cookie jar of its own. It starts empty for every test: the demo student, the way a browser that
// never onboarded is.
const jar = new Map<string, string>();

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => (jar.has(name) ? { name, value: jar.get(name) } : undefined),
    set: (name: string, value: string) => void jar.set(name, value),
  }),
}));

beforeEach(() => jar.clear());
