import { formatEquation } from "@/engine/format";
import { PLACEHOLDER } from "@/engine/template";
import type { Interest, ProblemInstance, ValidTemplate } from "@/engine/types";

type Variant = Interest | "neutral";

export type RenderedProblem =
  | { kind: "symbolic"; text: string; equation: string }
  | { kind: "word"; text: string; variant: Variant };

/** Rotates through the student's interests by problem index; neutral when there are none. */
export function selectVariant(interests: readonly Interest[], index: number): Variant {
  if (!Number.isSafeInteger(index) || index < 0) {
    throw new RangeError(`Problem index must be a non-negative integer, got ${index}`);
  }
  return interests[index % interests.length] ?? "neutral";
}

const TOKENS = new RegExp(PLACEHOLDER, "g");

function substitute(text: string, values: Readonly<Record<string, number>>): string {
  return text.replace(TOKENS, (_, name: string) => String(values[name]));
}

/**
 * Renders an instance of `template` for a student. Word problems use the variant for the student's
 * interests; symbolic problems show the neutral prompt with the equation. No model call, ever.
 */
export function renderProblem(
  template: ValidTemplate,
  instance: ProblemInstance,
  interests: readonly Interest[],
  index: number,
): RenderedProblem {
  if (instance.templateKey !== template.key) {
    throw new Error(`Instance of "${instance.templateKey}" rendered with "${template.key}"`);
  }
  const values: Readonly<Record<string, number>> = instance.values;
  if (template.kind === "symbolic") {
    return {
      kind: "symbolic",
      text: substitute(template.variants.neutral, values),
      equation: formatEquation(instance),
    };
  }
  const variant = selectVariant(interests, index);
  return { kind: "word", text: substitute(template.variants[variant], values), variant };
}
