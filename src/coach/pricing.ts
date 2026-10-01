/** Model prices and the cost of logged calls. */
import { COACH_MODEL } from "@/coach/prompt";

/** US dollars per million tokens. */
interface ModelPrice {
  input: number;
  output: number;
  /** Prompt tokens written to the cache (5-minute cache: 1.25 times input). */
  cacheWrite: number;
  /** Prompt tokens read from the cache (a tenth of input). */
  cacheRead: number;
}

/** Anthropic API list prices for the models the app calls. The coach and the grader share Haiku. */
export const MODEL_PRICES: Readonly<Record<string, ModelPrice>> = {
  [COACH_MODEL]: { input: 1, output: 5, cacheWrite: 1.25, cacheRead: 0.1 },
  "claude-sonnet-5-5": { input: 2, output: 10, cacheWrite: 2.5, cacheRead: 0.2 },
};

/** Token counts as `ai_usage` stores them. */
export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
}

/** What the calls cost in US cents, or null for a model with no price in `MODEL_PRICES`. */
export function costCents(model: string, usage: TokenUsage): number | null {
  const price = MODEL_PRICES[model];
  if (!price) return null;
  const dollars =
    (usage.inputTokens * price.input +
      usage.outputTokens * price.output +
      usage.cacheReadTokens * price.cacheRead +
      usage.cacheWriteTokens * price.cacheWrite) /
    1_000_000;
  return dollars * 100;
}
