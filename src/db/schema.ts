import { sql } from "drizzle-orm";
import { index, integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { EXPLAIN_SOURCES, EXPLAIN_VERDICTS } from "@/coach/rubric";
import type { Interest } from "@/engine/types";
import { BLOCK_IDS, PROBLEM_BLOCK_IDS, type BlockId } from "@/session/blocks";
import { MASTERY_STATUSES, SESSION_OUTCOMES } from "@/session/mastery";
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

// Minors' data: first names and interest tags only. No email, no birthdate, no free text.

/** The parent's account. Parents create and own every student account. */
export const families = sqliteTable("families", {
  id: id(),
  parentName: text("parent_name").notNull(),
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
    timerMode: text("timer_mode", { enum: TIMER_MODES }).notNull().default("standard"),
    interests: text("interests", { mode: "json" }).$type<Interest[]>().notNull(),
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
    startedAt: integer("started_at", { mode: "timestamp_ms" }),
    completedAt: integer("completed_at", { mode: "timestamp_ms" }),
    createdAt: createdAt(),
  },
  (t) => [
    index("session_logs_student_started_idx").on(t.studentId, t.startedAt),
    index("session_logs_template_id_idx").on(t.sessionTemplateId),
    // A student has at most one session open at a time.
    uniqueIndex("session_logs_one_open_idx")
      .on(t.studentId)
      .where(sql`${t.status} = 'in_progress'`),
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
    source: text("source", { enum: EXPLAIN_SOURCES }).notNull(),
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
    type: text("type", { enum: ["missed", "behind", "milestone"] }).notNull(),
    deliveredAt: integer("delivered_at", { mode: "timestamp_ms" }),
    createdAt: createdAt(),
  },
  (t) => [
    index("alerts_family_id_idx").on(t.familyId),
    index("alerts_student_id_idx").on(t.studentId),
  ],
);

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
