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

async function finalUsage(stream: MessageStream): Promise<CoachUsage> {
  const { usage } = await stream.finalMessage();
  return {
    inputTokens: usage.input_tokens,
    outputTokens: usage.output_tokens,
    cacheReadTokens: usage.cache_read_input_tokens ?? 0,
    cacheWriteTokens: usage.cache_creation_input_tokens ?? 0,
  };
}

let client: Anthropic | undefined;

/** Streams one coach turn from the small model. Output is capped; the prefix is cached. */
export function streamCoachReply(prompt: CoachPrompt): CoachReply {
  client ??= new Anthropic();
  const stream = client.messages.stream({
    model: COACH_MODEL,
    max_tokens: COACH_MAX_TOKENS,
    system: prompt.system,
    messages: prompt.messages,
  });
  return { deltas: textDeltas(stream), usage: () => finalUsage(stream) };
}
