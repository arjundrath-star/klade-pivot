import Anthropic from "@anthropic-ai/sdk";
import { COACH_MAX_TOKENS, COACH_MODEL, type CoachPrompt } from "@/coach/prompt";

/** Token counts of one call, in the shape `ai_usage` stores them. */
export interface CoachUsage {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
}

export interface CoachReply {
  /** Text as the model produces it. */
  deltas: AsyncIterable<string>;
  /** The call's token counts; resolves once the stream has ended. */
  usage: () => Promise<CoachUsage>;
}

/** The server reads the key from the environment. Without it the coach reports itself offline. */
export function coachConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

type MessageStream = ReturnType<Anthropic["messages"]["stream"]>;

async function* textDeltas(stream: MessageStream): AsyncGenerator<string> {
  for await (const event of stream) {
    if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
      yield event.delta.text;
    }
  }
}

function usageOf({ usage }: Anthropic.Message): CoachUsage {
  return {
    inputTokens: usage.input_tokens,
    outputTokens: usage.output_tokens,
    cacheReadTokens: usage.cache_read_input_tokens ?? 0,
    cacheWriteTokens: usage.cache_creation_input_tokens ?? 0,
  };
}

let client: Anthropic | undefined;

/**
 * The one client both the coach stream and the grader send through. An organization-level key is
 * refused unless every request names the workspace it bills to.
 */
function anthropic(): Anthropic {
  const workspaceId = process.env.ANTHROPIC_WORKSPACE_ID;
  client ??= new Anthropic(
    workspaceId ? { defaultHeaders: { "anthropic-workspace-id": workspaceId } } : {},
  );
  return client;
}

/** Streams one coach turn from the small model. Output is capped; the prefix is cached. */
export function streamCoachReply(prompt: CoachPrompt): CoachReply {
  const stream = anthropic().messages.stream({
    model: COACH_MODEL,
    max_tokens: COACH_MAX_TOKENS,
    system: prompt.system,
    messages: prompt.messages,
  });
  return { deltas: textDeltas(stream), usage: async () => usageOf(await stream.finalMessage()) };
}

export interface GradeReply {
  text: string;
  /** Anything but "end_turn" means the reply may be cut short. */
  stopReason: Anthropic.StopReason | null;
  usage: CoachUsage;
}

// Grading has to answer within five seconds, so a slow call gives up instead of retrying: the
// student sees "grading unavailable" and can submit again.
const GRADE_REQUEST = { timeout: 5000, maxRetries: 0 } as const;

/** One complete grading call. Throws the SDK's typed error when the API cannot be reached. */
export async function requestGrade(
  params: Anthropic.MessageCreateParamsNonStreaming,
): Promise<GradeReply> {
  const message = await anthropic().messages.create(params, GRADE_REQUEST);
  const text = message.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("");
  return { text, stopReason: message.stop_reason, usage: usageOf(message) };
}
