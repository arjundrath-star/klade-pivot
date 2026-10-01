import { sql } from "drizzle-orm";
import { index, integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { EXPLAIN_RECORD_SOURCES, EXPLAIN_VERDICTS } from "@/coach/rubric";
import { DEFAULT_SESSION_TIME, type Weekday } from "@/engine/pace";
import { XP_KINDS } from "@/engine/progress";
import type { Interest } from "@/engine/types";
import { BLOCK_IDS, PROBLEM_BLOCK_IDS, type BlockId } from "@/session/blocks";
import type { LockCategory } from "@/session/lock";
import { MASTERY_STATUSES, SESSION_OUTCOMES } from "@/session/mastery";
import { ALERT_TYPES } from "@/parent/alerts";
import { PRONOUNS } from "@/parent/pronouns";
import { TIMER_MODES } from "@/session/timer";

const id = () =>
  text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID());

const createdAt = () =>
  integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date());

const SESSION_STATUSES = ["scheduled", "in_progress", "done", "missed", "repeat"] as const;

// Minors' data: first name, grade, pronoun, interest tags (with a favorite picked from a fixed list)
// and the plan. No email, no birthdate, no free text.

/** The parent's account. Parents create and own every student account. */
export const families = sqliteTable("families", {
  id: id(),
  parentName: text("parent_name").notNull(),
  /**
   * Demo only: the moment the phone lock reads as "now" while set, so a demo can run at 5 PM on a
   * session day whatever the real day and hour. Set and cleared from /admin; only the lock reads it.
   */
  demoClock: integer("demo_clock", { mode: "timestamp_ms" }),
  createdAt: createdAt(),
});

export const students = sqliteTable(
  "students",
  {
    id: id(),
    familyId: text("family_id")
      .notNull()
      .references(() => families.id),
    name: text("name").notNull(),
    grade: integer("grade").notNull(),
    /** ISO date (YYYY-MM-DD) the family wants the course finished by. */
    targetDate: text("target_date").notNull(),
    pacePerWeek: integer("pace_per_week").notNull(),
    /** The weekdays the plan puts a session on, one per session a week. */
    sessionDays: text("session_days", { mode: "json" }).$type<Weekday[]>().notNull().default([]),
    /** When a session day's session starts, 24-hour "HH:MM" in the family's time zone. */
    sessionTime: text("session_time").notNull().default(DEFAULT_SESSION_TIME),
    pronoun: text("pronoun", { enum: PRONOUNS }).notNull().default("they"),
    timerMode: text("timer_mode", { enum: TIMER_MODES }).notNull().default("standard"),
    interests: text("interests", { mode: "json" }).$type<Interest[]>().notNull(),
    /** An optional favorite for each picked interest, from `FAVORITES` in src/content/interests. */
    favorites: text("favorites", { mode: "json" })
      .$type<Partial<Record<Interest, string>>>()
      .notNull()
      .default({}),
    createdAt: createdAt(),
  },
  (t) => [index("students_family_id_idx").on(t.familyId)],
);

export const courses = sqliteTable("courses", {
  id: id(),
  title: text("title").notNull(),
});

export const units = sqliteTable(
  "units",
  {
    id: id(),
    courseId: text("course_id")
      .notNull()
      .references(() => courses.id),
    title: text("title").notNull(),
    position: integer("position").notNull(),
  },
  (t) => [index("units_course_id_idx").on(t.courseId)],
);

export const sessionTemplates = sqliteTable(
  "session_templates",
  {
    id: id(),
    unitId: text("unit_id")
      .notNull()
      .references(() => units.id),
    title: text("title").notNull(),
    position: integer("position").notNull(),
    /** Key of the typed session content in `src/content/sessions.ts`. */
    contentKey: text("content_key").notNull().unique(),
  },
  (t) => [index("session_templates_unit_id_idx").on(t.unitId)],
);

export const sessionLogs = sqliteTable(
  "session_logs",
  {
    id: id(),
    studentId: text("student_id")
      .notNull()
      .references(() => students.id),
    sessionTemplateId: text("session_template_id")
      .notNull()
      .references(() => sessionTemplates.id),
    status: text("status", { enum: SESSION_STATUSES }).notNull(),
    /** Every problem seed in the session is drawn from this, so the session replays exactly. */
    seed: integer("seed").notNull(),
    currentBlock: text("current_block", { enum: BLOCK_IDS }).notNull().default("warmup"),
    blockStartedAt: integer("block_started_at", { mode: "timestamp_ms" }),
    /** Time spent in each block before the current visit, so leaving and returning keeps the clock. */
    blockElapsedMs: text("block_elapsed_ms", { mode: "json" })
      .$type<Partial<Record<BlockId, number>>>()
      .notNull()
      .default({}),
    /** When the student confirmed they read the lesson. Next out of the learn block waits for it. */
    lessonReadAt: integer("lesson_read_at", { mode: "timestamp_ms" }),
    /** The mastery verdict, set when the session is done. */
    outcome: text("outcome", { enum: SESSION_OUTCOMES }),
    /**
     * The family's calendar day (YYYY-MM-DD) this row holds a place on the schedule for. Set only on
     * schedule rows, whose status is `scheduled` or `missed`; sessions the student opens leave it null.
     */
    scheduledFor: text("scheduled_for"),
    startedAt: integer("started_at", { mode: "timestamp_ms" }),
    completedAt: integer("completed_at", { mode: "timestamp_ms" }),
    createdAt: createdAt(),
  },
  (t) => [
    index("session_logs_student_started_idx").on(t.studentId, t.startedAt),
    // The phone lock's poll reads the student's latest finished session.
    index("session_logs_student_completed_idx").on(t.studentId, t.status, t.completedAt),
    index("session_logs_template_id_idx").on(t.sessionTemplateId),
    // A student has at most one session open at a time.
    uniqueIndex("session_logs_one_open_idx")
      .on(t.studentId)
      .where(sql`${t.status} = 'in_progress'`),
    // One schedule row per student per day.
    uniqueIndex("session_logs_scheduled_idx")
      .on(t.studentId, t.scheduledFor)
      .where(sql`${t.scheduledFor} is not null`),
  ],
);

export const attempts = sqliteTable(
  "attempts",
  {
    id: id(),
    studentId: text("student_id")
      .notNull()
      .references(() => students.id),
    sessionLogId: text("session_log_id")
      .notNull()
      .references(() => sessionLogs.id),
    block: text("block", { enum: PROBLEM_BLOCK_IDS }).notNull(),
    problemIndex: integer("problem_index").notNull(),
    /** `templateKey` and `seed` regenerate the exact instance with `generateInstance`. */
    templateKey: text("template_key").notNull(),
    seed: integer("seed").notNull(),
    answer: text("answer").notNull(),
    correct: integer("correct", { mode: "boolean" }).notNull(),
    timeMs: integer("time_ms").notNull(),
    hintsUsed: integer("hints_used").notNull().default(0),
    createdAt: createdAt(),
  },
  (t) => [
    index("attempts_student_id_idx").on(t.studentId),
    index("attempts_session_log_id_idx").on(t.sessionLogId, t.block, t.problemIndex),
    // An exit-check problem takes exactly one attempt, even when two tabs answer at once.
    uniqueIndex("attempts_exit_once_idx")
      .on(t.sessionLogId, t.problemIndex)
      .where(sql`${t.block} = 'exit'`),
  ],
);

/**
 * When the server first sent each exit-check problem to the student. The deadline for the answer
 * runs from here, so reloading the page does not restart the clock.
 */
export const exitShown = sqliteTable(
  "exit_shown",
  {
    id: id(),
    sessionLogId: text("session_log_id")
      .notNull()
      .references(() => sessionLogs.id),
    problemIndex: integer("problem_index").notNull(),
    shownAt: integer("shown_at", { mode: "timestamp_ms" }).notNull(),
  },
  (t) => [uniqueIndex("exit_shown_problem_idx").on(t.sessionLogId, t.problemIndex)],
);

/**
 * One graded explain-back: the student's explanation of a solved problem and the rubric scores
 * (spec §5). A session holds at most `EXPLAIN_ATTEMPTS` rows. The integrity signals are for the
 * parent's aggregate view and are never shown to the student.
 */
export const explainBacks = sqliteTable(
  "explain_backs",
  {
    id: id(),
    sessionLogId: text("session_log_id")
      .notNull()
      .references(() => sessionLogs.id),
    /** The solved problem the student explained. */
    block: text("block", { enum: PROBLEM_BLOCK_IDS }).notNull(),
    problemIndex: integer("problem_index").notNull(),
    /** 1 for the first try, 2 for the retry after a failing first. */
    attempt: integer("attempt").notNull(),
    text: text("text").notNull(),
    /** `override`: an admin passed the explain-back without grading; the scores are zero. */
    source: text("source", { enum: EXPLAIN_RECORD_SOURCES }).notNull(),
    correctness: integer("correctness").notNull(),
    justification: integer("justification").notNull(),
    precision: integer("precision").notNull(),
    feedback: text("feedback").notNull(),
    verdict: text("verdict", { enum: EXPLAIN_VERDICTS }).notNull(),
    /** A paste event fired in the explanation field. */
    pasted: integer("pasted", { mode: "boolean" }).notNull(),
    /** From the first edit of the field to submit. */
    durationMs: integer("duration_ms").notNull(),
    charsPerSecond: real("chars_per_second").notNull(),
    createdAt: createdAt(),
  },
  // One row per attempt: two tabs submitting at once cannot both record a first try.
  (t) => [uniqueIndex("explain_backs_attempt_idx").on(t.sessionLogId, t.attempt)],
);

/**
 * Where a student stands on one concept. A concept is one session template. The evidence columns
 * point at the session that decided the status and stay null while the concept is in progress.
 */
export const mastery = sqliteTable(
  "mastery",
  {
    id: id(),
    studentId: text("student_id")
      .notNull()
      .references(() => students.id),
    sessionTemplateId: text("session_template_id")
      .notNull()
      .references(() => sessionTemplates.id),
    status: text("status", { enum: MASTERY_STATUSES }).notNull(),
    sessionLogId: text("session_log_id").references(() => sessionLogs.id),
    /** Exit-check problems answered correctly in that session. */
    exitScore: integer("exit_score"),
    /** The session's final explain-back attempt. */
    explainBackId: text("explain_back_id").references(() => explainBacks.id),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => [uniqueIndex("mastery_student_concept_idx").on(t.studentId, t.sessionTemplateId)],
);

/**
 * A notice to the family about one session: a missed scheduled session or a mastered concept. The
 * message is written when the alert is raised, so it keeps the numbers that were true then.
 */
export const alerts = sqliteTable(
  "alerts",
  {
    id: id(),
    familyId: text("family_id")
      .notNull()
      .references(() => families.id),
    studentId: text("student_id")
      .notNull()
      .references(() => students.id),
    type: text("type", { enum: ALERT_TYPES }).notNull(),
    /** The schedule row that was missed, or the session that decided the concept. */
    sessionLogId: text("session_log_id")
      .notNull()
      .references(() => sessionLogs.id),
    message: text("message").notNull(),
    /** When an email went out. No email is sent yet, so this stays null. */
    deliveredAt: integer("delivered_at", { mode: "timestamp_ms" }),
    createdAt: createdAt(),
  },
  (t) => [
    index("alerts_family_created_idx").on(t.familyId, t.createdAt),
    // A session raises each kind of alert once, even when two requests raise it together.
    uniqueIndex("alerts_session_type_idx").on(t.sessionLogId, t.type),
  ],
);

/**
 * XP the student earned in one session for one thing the session pays for (`XP_TABLE`). Unique on
 * the session and the kind, so a replayed action or a second tab never pays twice.
 */
export const xpEvents = sqliteTable(
  "xp_events",
  {
    id: id(),
    studentId: text("student_id")
      .notNull()
      .references(() => students.id),
    sessionLogId: text("session_log_id")
      .notNull()
      .references(() => sessionLogs.id),
    kind: text("kind", { enum: XP_KINDS }).notNull(),
    amount: integer("amount").notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("xp_events_session_kind_idx").on(t.sessionLogId, t.kind),
    index("xp_events_student_idx").on(t.studentId),
  ],
);

/** A badge the student earned, once each, and the finished session that earned it. */
export const badges = sqliteTable(
  "badges",
  {
    id: id(),
    studentId: text("student_id")
      .notNull()
      .references(() => students.id),
    /** A key from `allBadges` in src/engine/progress. */
    key: text("key").notNull(),
    sessionLogId: text("session_log_id")
      .notNull()
      .references(() => sessionLogs.id),
    earnedAt: integer("earned_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => [
    uniqueIndex("badges_student_key_idx").on(t.studentId, t.key),
    index("badges_session_log_idx").on(t.sessionLogId),
  ],
);

/**
 * The parent's phone rule for one student (steering §3.1): on `days`, lock the apps in
 * `categories` from `start_time` until the day's session is done. The phone is a mock; nothing
 * here touches a real device, and nothing the student can do changes the rule.
 */
export const lockRules = sqliteTable("lock_rules", {
  id: id(),
  studentId: text("student_id")
    .notNull()
    .unique()
    .references(() => students.id),
  enabled: integer("enabled", { mode: "boolean" }).notNull(),
  days: text("days", { mode: "json" }).$type<Weekday[]>().notNull(),
  /** 24-hour "HH:MM" in the family's time zone. */
  startTime: text("start_time").notNull().default(DEFAULT_SESSION_TIME),
  categories: text("categories", { mode: "json" }).$type<LockCategory[]>().notNull(),
  /** Saturdays and Sundays never lock, whatever `days` says. */
  weekendOff: integer("weekend_off", { mode: "boolean" }).notNull().default(false),
  /** The parent's "Unlock tonight": no lock before this moment. */
  overrideUntil: integer("override_until", { mode: "timestamp_ms" }),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
});

/** One coach exchange: what the student said and what the coach answered, at one hint level. */
export const coachTurns = sqliteTable(
  "coach_turns",
  {
    id: id(),
    sessionLogId: text("session_log_id")
      .notNull()
      .references(() => sessionLogs.id),
    block: text("block", { enum: PROBLEM_BLOCK_IDS }).notNull(),
    problemIndex: integer("problem_index").notNull(),
    /** Which hint this turn gave, 1 to 3. */
    level: integer("level").notNull(),
    studentText: text("student_text").notNull(),
    /** The reply as the student saw it, after the output filter. */
    coachText: text("coach_text").notNull(),
    /** The output filter hid a leaked final value before the reply reached the student. */
    redacted: integer("redacted", { mode: "boolean" }).notNull().default(false),
    createdAt: createdAt(),
  },
  // One row per hint level: two tabs asking at once cannot both record the same hint.
  (t) => [
    uniqueIndex("coach_turns_level_idx").on(t.sessionLogId, t.block, t.problemIndex, t.level),
  ],
);

export const aiUsage = sqliteTable(
  "ai_usage",
  {
    id: id(),
    kind: text("kind", { enum: ["coach", "explain_back", "digest"] }).notNull(),
    model: text("model").notNull(),
    inputTokens: integer("input_tokens").notNull(),
    outputTokens: integer("output_tokens").notNull(),
    /** Prompt tokens served from the cache, at about a tenth of the input price. */
    cacheReadTokens: integer("cache_read_tokens").notNull().default(0),
    /** Prompt tokens written to the cache, at about 1.25 times the input price. */
    cacheWriteTokens: integer("cache_write_tokens").notNull().default(0),
    sessionLogId: text("session_log_id").references(() => sessionLogs.id),
    createdAt: createdAt(),
  },
  (t) => [index("ai_usage_session_kind_idx").on(t.sessionLogId, t.kind)],
);
