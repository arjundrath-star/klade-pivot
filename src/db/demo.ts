import { sql } from "drizzle-orm";
import type { LibSQLDatabase } from "drizzle-orm/libsql";
import { ALGEBRA1_COURSE, ALGEBRA1_TITLE } from "@/content/algebra1/course";
import { S1_DEMO_KEY, S1_KEY } from "@/content/keys";
import type { RewardProgress } from "@/content/rewards";
import { sessionContent } from "@/content/sessions";
import { getDb } from "@/db/client";
import { scheduleRows, type ScheduledDay } from "@/db/queries/students";
import {
  aiUsage,
  alerts,
  attempts,
  badges,
  coachTurns,
  courses,
  exitShown,
  explainBacks,
  families,
  lockRules,
  mastery,
  mentorAssignments,
  mentors,
  rewardProgress,
  rewardUnlocks,
  sessionLogs,
  sessionTemplates,
  students,
  units,
  xpEvents,
} from "@/db/schema";
import { conceptsBefore } from "@/engine/course";
import {
  addDays,
  ALGEBRA1_SESSION_ESTIMATE,
  DEFAULT_SESSION_TIME,
  firstScheduleDays,
  PRESET_SESSIONS,
  proposedDays,
  weekdayOf,
  type Weekday,
} from "@/engine/pace";
import { earnedBadges, streakSpan, XP_KINDS, xpAward } from "@/engine/progress";
import type { Interest } from "@/engine/types";
import { calendarDay, familyMoment } from "@/parent/progress";
import { BLOCK_IDS, BLOCKS, type BlockId } from "@/session/blocks";
import { defaultRule } from "@/session/lock";
import { randomSeed } from "@/session/random-seed";

/** There is no sign-in yet, so the student pages act as this seeded student. */
export const DEMO_STUDENT_ID = "demo-student-maya";

/** The demo student's family: the parent pages and the admin panel act for it. */
export const DEMO_FAMILY_ID = "demo-family";

/** Maya's interests as the seed writes them; the demo's word problems are framed in them. */
export const DEMO_INTERESTS: readonly Interest[] = ["sports", "music"];

/**
 * The session seed of every session the demo student opens, in place of a random one, so the
 * recorded demo shows the same problems on every run. Each problem's own seed still comes from
 * `problemSeed`, so stored attempts replay as for any session. The runbook's "Demo problems" table
 * lists what it draws (`demoProblemCells`).
 */
export const DEMO_SESSION_SEED = 20261002;

/** The seed for a session `studentId` opens: the fixed demo seed for Maya, else random. */
export function sessionSeedFor(studentId: string): number {
  return studentId === DEMO_STUDENT_ID ? DEMO_SESSION_SEED : randomSeed();
}

/**
 * The content the demo student runs in place of a concept's own: Session 1 with two problems a
 * practice block. The concept, its template row, mastery and the map are the same as anyone's.
 */
const DEMO_CONTENT_KEYS: ReadonlyMap<string, string> = new Map([[S1_KEY, S1_DEMO_KEY]]);

/** The content key a session of `conceptKey` runs for `studentId`: the demo variant for Maya. */
export function sessionContentKeyFor(studentId: string, conceptKey: string): string {
  if (studentId !== DEMO_STUDENT_ID) return conceptKey;
  return DEMO_CONTENT_KEYS.get(conceptKey) ?? conceptKey;
}

const COURSE_ID = "algebra-1";

/** The unit row id for a unit of the course: "algebra-1-linear-equations". */
function unitIdFor(slug: string): string {
  return `${COURSE_ID}-${slug}`;
}

/**
 * The session template row id for a concept key: "algebra1/linear-equations/s1" is stored as
 * "algebra-1-linear-equations-s1", the id the first concept shipped under.
 */
export function templateIdFor(key: string): string {
  return key.replace(/^algebra1\//, `${COURSE_ID}-`).replaceAll("/", "-");
}

/** The template of the one playable concept: solving two-step linear equations. */
export const S1_TEMPLATE_ID = templateIdFor(S1_KEY);

/**
 * The concepts the demo student has mastered: every one before two-step equations in course
 * order, so her position on the map is the first concept the product can teach (decision D45).
 */
export const DEMO_MASTERED_KEYS: readonly string[] = conceptsBefore(ALGEBRA1_COURSE, S1_KEY);

/** The 4-week streak reward's target: the session the demo runs is the one that completes it. */
export const STREAK_REWARD_WEEKS = 4;

/**
 * The demo student's completion-reward rows (prototype). The live numbers come from her records,
 * on top of each row: sessions finished for the course and the unit, and the calendar weeks of her
 * streak for the 4-week streak, whose row holds the weeks before the records begin. She is not on
 * Intensive pace.
 */
function demoRewards(streakWeeksBeforeRecord: number): RewardProgress[] {
  return [
    { key: "course-on-time", current: 0, target: ALGEBRA1_SESSION_ESTIMATE },
    { key: "unit-on-time", current: 0, target: ALGEBRA1_COURSE[0].sessions },
    { key: "streak-4-weeks", current: streakWeeksBeforeRecord, target: STREAK_REWARD_WEEKS },
    { key: "intensive-pace", current: 0, target: 4 },
  ];
}

/** The demo student's mentor (prototype, seeded). The parent has another name on purpose. */
const DEMO_MENTOR = { id: "demo-mentor-jordan", name: "Jordan", school: "NYU", classYear: 2028 };

const MAYA_PLAN = {
  sessionDays: proposedDays(PRESET_SESSIONS["on-track"]),
  sessionTime: DEFAULT_SESSION_TIME,
};

/** The demo's phone rule: the one onboarding proposes for Maya's plan, games and social at 5 PM. */
export const DEMO_LOCK_RULE = defaultRule(MAYA_PLAN);

/** The tables the curriculum lives in. Reset demo keeps them; the seed upserts into them. */
export const CURRICULUM_TABLES = [courses, units, sessionTemplates] as const;

/**
 * Every other table, children before parents, which Reset demo empties. A unit test checks the
 * two lists together cover the schema, so a new table cannot survive a reset by accident.
 */
export const DEMO_RESET_TABLES = [
  aiUsage,
  coachTurns,
  rewardUnlocks,
  rewardProgress,
  mentorAssignments,
  mentors,
  badges,
  xpEvents,
  alerts,
  mastery,
  explainBacks,
  exitShown,
  attempts,
  sessionLogs,
  lockRules,
  students,
  families,
] as const;

/** May 31 of the next May that has not started yet. */
export function nextMay(now: Date): string {
  const year = now.getMonth() >= 4 ? now.getFullYear() + 1 : now.getFullYear();
  return `${year}-05-31`;
}

type Statements = Parameters<LibSQLDatabase["batch"]>[0];

/** The course, its units and one session template per concept, all from the course file. */
function curriculumStatements(db: LibSQLDatabase): Statements {
  const course = { id: COURSE_ID, title: ALGEBRA1_TITLE };
  const unitRows = ALGEBRA1_COURSE.map((unit) => ({
    id: unitIdFor(unit.slug),
    courseId: course.id,
    title: unit.title,
    position: unit.number,
  }));
  const templateRows = ALGEBRA1_COURSE.flatMap((unit) =>
    unit.concepts.map((concept, index) => ({
      id: templateIdFor(concept.key),
      unitId: unitIdFor(unit.slug),
      title: concept.title,
      position: index + 1,
      contentKey: concept.key,
      playable: concept.playable,
    })),
  );
  return [
    db.insert(courses).values(course).onConflictDoUpdate({ target: courses.id, set: course }),
    db
      .insert(units)
      .values(unitRows)
      .onConflictDoUpdate({
        target: units.id,
        set: {
          courseId: sql`excluded.course_id`,
          title: sql`excluded.title`,
          position: sql`excluded.position`,
        },
      }),
    db
      .insert(sessionTemplates)
      .values(templateRows)
      .onConflictDoUpdate({
        target: sessionTemplates.id,
        set: {
          unitId: sql`excluded.unit_id`,
          title: sql`excluded.title`,
          position: sql`excluded.position`,
          contentKey: sql`excluded.content_key`,
          playable: sql`excluded.playable`,
        },
      }),
  ];
}

/**
 * The curriculum rows and the demo family: a parent and Maya, grade 6, on track for May, with the
 * prototype's reward rows and mentor, and the demo clock off. Every statement is an upsert, so a
 * re-seed restores the profile and leaves session history, reward progress and unlocked rewards
 * alone. `streakWeeksBeforeRecord` is what the 4-week streak row starts at: on a blank record, one
 * session short of the target, less the weeks a seeded record covers.
 */
function profileStatements(
  db: LibSQLDatabase,
  now: Date,
  streakWeeksBeforeRecord = STREAK_REWARD_WEEKS - 1,
): Statements {
  const family = { id: DEMO_FAMILY_ID, parentName: "Dana", demoClock: null };
  const maya = {
    id: DEMO_STUDENT_ID,
    familyId: DEMO_FAMILY_ID,
    name: "Maya",
    grade: 6,
    targetDate: nextMay(now),
    pacePerWeek: PRESET_SESSIONS["on-track"],
    ...MAYA_PLAN,
    pronoun: "she" as const,
    timerMode: "standard" as const,
    interests: [...DEMO_INTERESTS],
    favorites: {},
  };
  const checkIn = {
    studentId: maya.id,
    mentorId: DEMO_MENTOR.id,
    checkInDay: "thu" as const,
    checkInTime: "19:00",
    lastSummary:
      "Maya explained a two-step equation out loud without her notes. Her goal this week: four sessions, each on its day.",
    note: "On Thursday, walk me through one problem out loud, then we set this week's goal.",
  };

  return [
    db.insert(families).values(family).onConflictDoUpdate({ target: families.id, set: family }),
    db.insert(students).values(maya).onConflictDoUpdate({ target: students.id, set: maya }),
    ...curriculumStatements(db),
    // A re-seed restores a reward's target and leaves its progress as the record left it.
    db
      .insert(rewardProgress)
      .values(demoRewards(streakWeeksBeforeRecord).map((row) => ({ studentId: maya.id, ...row })))
      .onConflictDoUpdate({
        target: [rewardProgress.studentId, rewardProgress.key],
        set: { target: sql`excluded.target` },
      }),
    db
      .insert(mentors)
      .values(DEMO_MENTOR)
      .onConflictDoUpdate({ target: mentors.id, set: DEMO_MENTOR }),
    db
      .insert(mentorAssignments)
      .values(checkIn)
      .onConflictDoUpdate({ target: mentorAssignments.studentId, set: checkIn }),
  ];
}

/** One day of Maya's record: the concept she mastered that day and its session's seed. */
interface RecordDay {
  /** YYYY-MM-DD */
  day: string;
  key: string;
  seed: number;
}

/** The last `count` days before `today` that fall on `weekdays`, oldest first. */
function pastScheduleDays(today: string, weekdays: readonly Weekday[], count: number): string[] {
  const days: string[] = [];
  for (let day = addDays(today, -1); days.length < count; day = addDays(day, -1)) {
    if (weekdays.includes(weekdayOf(day))) days.unshift(day);
  }
  return days;
}

/** Maya's record: one mastered concept per schedule day, on her last days before `today`. */
function demoRecord(today: string): RecordDay[] {
  const days = pastScheduleDays(today, MAYA_PLAN.sessionDays, DEMO_MASTERED_KEYS.length);
  return days.map((day, index) => ({ day, key: DEMO_MASTERED_KEYS[index], seed: 1000 + index }));
}

/**
 * The 4-week streak row's start: the target less the calendar weeks the record's streak will
 * cover once today's session is done, by the same rule the live board counts them with, so that
 * session completes the reward whatever weekday the demo runs on. On a day that starts a new week
 * the board reads one week short before the session; on any other day it reads at the target,
 * waiting on the session. Never below zero, should the record ever grow past the target.
 */
function streakWeeksBeforeRecord(record: readonly RecordDay[], today: string): number {
  const days = [...record.map(({ day }) => day), today];
  const slots = days.map((day) => ({ day, status: "scheduled" as const }));
  return Math.max(0, STREAK_REWARD_WEEKS - streakSpan(slots, days, today, days.length).weeks);
}

/** The content the shipped session has: the seeded sessions earned and scored like it. */
const SESSION_SHAPE = sessionContent(S1_KEY);

/**
 * How long each block of a seeded session took: its budget, with the guided block a minute either
 * side of it by session so no two sessions read the same.
 */
function seededBlockTimes(index: number): Record<BlockId, number> {
  const minutes = (block: BlockId) =>
    BLOCKS[block].minutes + (block === "guided" ? (index % 3) - 1 : 0);
  return Object.fromEntries(BLOCK_IDS.map((block) => [block, minutes(block) * 60_000])) as Record<
    BlockId,
    number
  >;
}

/**
 * Maya's record as rows: one finished session per mastered concept, each with the mastery row,
 * the XP and the badges its session would have earned, worked out by the same rules the live
 * session uses. Completion rewards read her sessions live, so none is seeded as unlocked. No
 * explain-back is seeded either: her words come from the session the demo runs.
 */
function historyStatements(db: LibSQLDatabase, record: readonly RecordDay[]): Statements[number][] {
  const mastered = new Set<string>();
  const earned = new Set<string>();
  const logs: (typeof sessionLogs.$inferInsert)[] = [];
  const masteryRows: (typeof mastery.$inferInsert)[] = [];
  const xp: (typeof xpEvents.$inferInsert)[] = [];
  const badgeRows: (typeof badges.$inferInsert)[] = [];
  record.forEach(({ day, key, seed }, index) => {
    const id = `demo-session-${index + 1}`;
    const blockElapsedMs = seededBlockTimes(index);
    const startedAt = familyMoment(day, MAYA_PLAN.sessionTime);
    const elapsed = Object.values(blockElapsedMs).reduce((sum, ms) => sum + ms, 0);
    const completedAt = new Date(startedAt.getTime() + elapsed);
    const templateId = templateIdFor(key);
    mastered.add(key);
    const newBadges = earnedBadges(ALGEBRA1_COURSE, {
      mastered,
      streak: index + 1,
      perfectExplanation: false,
    }).filter((badge) => !earned.has(badge.key));
    newBadges.forEach((badge) => earned.add(badge.key));
    logs.push({
      id,
      studentId: DEMO_STUDENT_ID,
      sessionTemplateId: templateId,
      status: "done",
      seed,
      currentBlock: "exit",
      blockStartedAt: completedAt,
      blockElapsedMs,
      lessonReadAt: new Date(startedAt.getTime() + blockElapsedMs.warmup + blockElapsedMs.learn),
      outcome: "mastered",
      startedAt,
      completedAt,
      createdAt: startedAt,
    });
    masteryRows.push({
      studentId: DEMO_STUDENT_ID,
      sessionTemplateId: templateId,
      status: "mastered",
      sessionLogId: id,
      exitScore: SESSION_SHAPE.exit.length,
      exitTotal: SESSION_SHAPE.exit.length,
      updatedAt: completedAt,
    });
    xp.push(
      ...XP_KINDS.map((kind) => ({
        studentId: DEMO_STUDENT_ID,
        sessionLogId: id,
        ...xpAward(kind, kind === "guided" ? SESSION_SHAPE.guided.length : 1),
        createdAt: completedAt,
      })),
    );
    badgeRows.push(
      ...newBadges.map((badge) => ({
        studentId: DEMO_STUDENT_ID,
        key: badge.key,
        sessionLogId: id,
        earnedAt: completedAt,
      })),
    );
  });
  return [
    db.insert(sessionLogs).values(logs).onConflictDoNothing(),
    db.insert(mastery).values(masteryRows).onConflictDoNothing(),
    db.insert(xpEvents).values(xp).onConflictDoNothing(),
    db.insert(badges).values(badgeRows).onConflictDoNothing(),
  ];
}

/** The days of Maya's record, the demo day and the next two weeks of her schedule. */
function demoScheduleDays(record: readonly RecordDay[], today: string): ScheduledDay[] {
  const ahead = new Set([today, ...firstScheduleDays(today, MAYA_PLAN.sessionDays)]);
  return [
    ...record.map(({ day, key, seed }) => ({ day, sessionTemplateId: templateIdFor(key), seed })),
    ...[...ahead].map((day) => ({ day, sessionTemplateId: S1_TEMPLATE_ID, seed: randomSeed() })),
  ];
}

/**
 * The state the demo starts from (milestone 12, extended in 13): Maya's record of the concepts
 * before two-step equations, today on her schedule whatever its weekday (the demo day is a Friday
 * and her days are not), the next two weeks of her session days, and her phone rule switched on
 * with no unlock running.
 */
function demoStateStatements(
  db: LibSQLDatabase,
  now: Date,
  record: readonly RecordDay[],
): Statements {
  const today = calendarDay(now);
  const rule = { enabled: true, ...DEMO_LOCK_RULE, overrideUntil: null, updatedAt: now };
  return [
    db
      .insert(sessionLogs)
      .values(scheduleRows(DEMO_STUDENT_ID, demoScheduleDays(record, today)))
      .onConflictDoNothing(),
    db
      .insert(lockRules)
      .values({ studentId: DEMO_STUDENT_ID, ...rule })
      .onConflictDoUpdate({ target: lockRules.studentId, set: rule }),
    ...historyStatements(db, record),
  ];
}

/**
 * Seeds the curriculum rows and the demo family (`profileStatements`). Safe to run again: it
 * restores the demo profile and leaves session history, the schedule and rewards alone. The unit
 * tests and the smoke server start from this, with Maya's record empty.
 */
export async function seedDemo(now = new Date()): Promise<void> {
  const db = await getDb();
  await db.batch(profileStatements(db, now));
}

/**
 * Puts the database in exactly the state the demo starts from: every family and all history gone,
 * then the demo profile and the demo's starting state, Maya's record included. `npm run db:seed --
 * --demo` and the admin panel's "Reset demo" both run this. One transaction, so a page that loads
 * during the reset sees the old state or the new, never neither.
 */
export async function resetDemoData(now = new Date()): Promise<void> {
  const db = await getDb();
  const today = calendarDay(now);
  const record = demoRecord(today);
  const [first, ...rest] = DEMO_RESET_TABLES;
  await db.batch([
    db.delete(first),
    ...rest.map((table) => db.delete(table)),
    ...profileStatements(db, now, streakWeeksBeforeRecord(record, today)),
    ...demoStateStatements(db, now, record),
  ]);
}
