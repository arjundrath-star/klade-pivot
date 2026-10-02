import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { construct } = vi.hoisted(() => ({ construct: vi.fn() }));

vi.mock("@anthropic-ai/sdk", () => ({
  default: class {
    constructor(options: unknown) {
      construct(options);
    }
    messages = {
      stream: () => ({}),
      create: async () => ({
        content: [],
        stop_reason: "end_turn",
        usage: { input_tokens: 0, output_tokens: 0 },
      }),
    };
  },
}));

const prompt = { system: [], messages: [] };

beforeEach(() => {
  vi.resetModules();
  construct.mockReset();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("the Anthropic client", () => {
  it("sends the workspace header when ANTHROPIC_WORKSPACE_ID is set", async () => {
    vi.stubEnv("ANTHROPIC_WORKSPACE_ID", "wrkspc_test");
    const { requestGrade, streamCoachReply } = await import("@/coach/client");
    streamCoachReply(prompt);
    await requestGrade({ model: "m", max_tokens: 1, messages: [] });
    expect(construct).toHaveBeenCalledOnce();
    expect(construct).toHaveBeenCalledWith({
      defaultHeaders: { "anthropic-workspace-id": "wrkspc_test" },
    });
  });

  it("omits the header when ANTHROPIC_WORKSPACE_ID is unset", async () => {
    vi.stubEnv("ANTHROPIC_WORKSPACE_ID", undefined);
    const { streamCoachReply } = await import("@/coach/client");
    streamCoachReply(prompt);
    expect(construct).toHaveBeenCalledWith({});
  });
});
