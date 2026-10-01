/** The pronoun the parent picks for the student at onboarding. Parent-facing copy uses it. */
export const PRONOUNS = ["she", "he", "they"] as const;

export type Pronoun = (typeof PRONOUNS)[number];

interface PronounForms {
  /** "She's" */
  is: string;
  /** "her" */
  possessive: string;
}

export const PRONOUN_FORMS: Readonly<Record<Pronoun, PronounForms>> = {
  she: { is: "She's", possessive: "her" },
  he: { is: "He's", possessive: "his" },
  they: { is: "They're", possessive: "their" },
};
