/**
 * XP, streaks, levels and badges (steering §3.2). Pure: the session actions and the completion
 * function decide when something was earned and store it; these functions say what it is worth.
 * XP pays for work completed and gates passed, never for speed or scores.
 */
import type { ScheduleSlot } from "@/engine/pace";

export const XP_KINDS = ["warmup", "guided", "explain", "exit"] as const;

export type XpKind = (typeof XP_KINDS)[number];

/**
 * XP for each thing a session pays for: the warm-up block complete, each guided problem solved,
 * the explain-back passed, the exit check passed.
 */
export const XP_TABLE: Readonly<Record<XpKind, number>> = {
  warmup: 10,
  guided: 5,
  explain: 25,
  exit: 50,
};

export interface XpAward {
  kind: XpKind;
  amount: number;
}

/** The award for `kind`, `count` times over: a guided block pays per problem solved. */
export function xpAward(kind: XpKind, count = 1): XpAward {
  return { kind, amount: XP_TABLE[kind] * count };
}

/** On-time sessions after a used freeze that bank it again. */
export const FREEZE_RESTORE_SESSIONS = 5;

const STREAK_BADGE_SESSIONS = 5;

export interface Streak {
  /** Scheduled sessions in a row, each completed on its scheduled day. */
  count: number;
  /**
   * On-time sessions still needed to bank the streak freeze again. 0 means it is banked: the next
   * missed session leaves the streak standing.
   */
  untilFreeze: number;
}

/**
 * The streak as of `today`, walking the schedule in order. A schedule day with a session completed
 * on it extends the streak, whatever its stored status. A day before today without one, or today
 * once marked missed, is a miss: it spends the banked freeze if there is one and otherwise ends the
 * streak. A miss with no streak to protect changes nothing. Today, still open, counts for nothing yet. The freeze starts banked and comes back after
 * `FREEZE_RESTORE_SESSIONS` on-time sessions. Days off the schedule never count, whatever was done
 * on them.
 */
export function streak(
  slots: readonly ScheduleSlot[],
  completedDays: readonly string[],
  today: string,
): Streak {
  const completed = new Set(completedDays);
  const days = slots.filter((slot) => slot.day <= today).sort((a, b) => a.day.localeCompare(b.day));
  let count = 0;
  let untilFreeze = 0;
  for (const { day, status } of days) {
    if (completed.has(day)) {
      count += 1;
      if (untilFreeze > 0) untilFreeze -= 1;
    } else if (count > 0 && (day < today || status === "missed")) {
      if (untilFreeze === 0) untilFreeze = FREEZE_RESTORE_SESSIONS;
      else count = 0;
    }
  }
  return { count, untilFreeze };
}

/** A concept of the course with content, as badges and levels count it. */
interface ConceptOutline {
  /** The session content key the concept's session template points at. */
  key: string;
  title: string;
}

/** A unit and the concepts it has content for today, in course order. */
export interface UnitOutline {
  number: number;
  concepts: readonly ConceptOutline[];
}

function unitMastered(unit: UnitOutline, mastered: ReadonlySet<string>): boolean {
  return unit.concepts.length > 0 && unit.concepts.every((concept) => mastered.has(concept.key));
}

/** Level 1, plus one for every unit whose concepts are all mastered. */
export function level(units: readonly UnitOutline[], mastered: ReadonlySet<string>): number {
  return 1 + units.filter((unit) => unitMastered(unit, mastered)).length;
}

interface UnitProgress {
  number: number;
  mastered: number;
  total: number;
}

/** The first unit with content not yet mastered, or the last such unit once every one is. */
export function currentUnit(
  units: readonly UnitOutline[],
  mastered: ReadonlySet<string>,
): UnitProgress | undefined {
  const withContent = units.filter((u) => u.concepts.length > 0);
  const unit = withContent.find((u) => !unitMastered(u, mastered)) ?? withContent.at(-1);
  if (!unit) return undefined;
  const done = unit.concepts.filter((concept) => mastered.has(concept.key)).length;
  return { number: unit.number, mastered: done, total: unit.concepts.length };
}

export interface Badge {
  key: string;
  label: string;
  /** What earned it, in words that claim no more than that. */
  detail: string;
}

export interface BadgeEvidence {
  /** Content keys of the concepts the student has mastered. */
  mastered: ReadonlySet<string>;
  streak: number;
  /** The explain-back just graded scored 3 on every criterion. */
  perfectExplanation: boolean;
}

/** A badge and the evidence that earns it. */
interface BadgeRule {
  badge: Badge;
  earned: (evidence: BadgeEvidence) => boolean;
}

function conceptRule(concept: ConceptOutline): BadgeRule {
  return {
    badge: {
      key: `concept:${concept.key}`,
      label: `${concept.title} mastered`,
      detail: "Passed the exit check and the explain-back.",
    },
    earned: ({ mastered }) => mastered.has(concept.key),
  };
}

// The unit badge says how many concepts the unit has content for, so with one concept shipped it
// does not read as the whole unit's estimated sessions.
function unitRule(unit: UnitOutline): BadgeRule {
  const count = unit.concepts.length;
  return {
    badge: {
      key: `unit:${unit.number}`,
      label: `Unit ${unit.number} Mastered`,
      detail: `Every concept Unit ${unit.number} has so far: ${count} of ${count}.`,
    },
    earned: ({ mastered }) => unitMastered(unit, mastered),
  };
}

const STREAK_RULE: BadgeRule = {
  badge: {
    key: "streak-5",
    label: `${STREAK_BADGE_SESSIONS}-session streak`,
    detail: `${STREAK_BADGE_SESSIONS} scheduled sessions in a row, each done on its day.`,
  },
  earned: ({ streak }) => streak >= STREAK_BADGE_SESSIONS,
};

const PERFECT_EXPLANATION_RULE: BadgeRule = {
  badge: {
    key: "explained-perfectly",
    label: "Explained it perfectly",
    detail: "3 of 3 on correctness, justification and precision.",
  },
  earned: ({ perfectExplanation }) => perfectExplanation,
};

/** Every badge rule, in shelf order: each unit's concepts then the unit, then the rest. */
function badgeRules(units: readonly UnitOutline[]): BadgeRule[] {
  return [
    ...units.flatMap((unit) => [...unit.concepts.map(conceptRule), unitRule(unit)]),
    STREAK_RULE,
    PERFECT_EXPLANATION_RULE,
  ];
}

/** Every badge there is, in shelf order. */
export function allBadges(units: readonly UnitOutline[]): Badge[] {
  return badgeRules(units).map((rule) => rule.badge);
}

/** The badges the evidence earns. A badge is kept once earned, so storing these never revokes. */
export function earnedBadges(units: readonly UnitOutline[], evidence: BadgeEvidence): Badge[] {
  return badgeRules(units)
    .filter((rule) => rule.earned(evidence))
    .map((rule) => rule.badge);
}
