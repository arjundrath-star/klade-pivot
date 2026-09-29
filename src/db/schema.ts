import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import type { Interest } from "@/engine/types";
import { BLOCK_IDS, PROBLEM_BLOCK_IDS, type BlockId } from "@/session/blocks";
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
  ],
);

export const explainBacks = sqliteTable(
  "explain_backs",
  {
    id: id(),
    sessionLogId: text("session_log_id")
      .notNull()
      .references(() => sessionLogs.id),
    text: text("text").notNull(),
    source: text("source", { enum: ["voice", "typed"] }).notNull(),
    scores: text("scores", { mode: "json" }).$type<Record<string, number>>().notNull(),
    verdict: text("verdict", { enum: ["pass", "retry"] }).notNull(),
    integrityFlags: text("integrity_flags", { mode: "json" }).$type<string[]>().notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("explain_backs_session_log_id_idx").on(t.sessionLogId)],
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

export const aiUsage = sqliteTable(
  "ai_usage",
  {
    id: id(),
    kind: text("kind", { enum: ["coach", "explain_back", "digest"] }).notNull(),
    model: text("model").notNull(),
    inputTokens: integer("input_tokens").notNull(),
    outputTokens: integer("output_tokens").notNull(),
    cachedTokens: integer("cached_tokens").notNull().default(0),
    sessionLogId: text("session_log_id").references(() => sessionLogs.id),
    createdAt: createdAt(),
  },
  (t) => [index("ai_usage_session_log_id_idx").on(t.sessionLogId)],
);
