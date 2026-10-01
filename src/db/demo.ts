import type { LibSQLDatabase } from "drizzle-orm/libsql";
import { ALGEBRA1_CONTENT } from "@/content/algebra1/concepts";
import { ALGEBRA1_UNITS } from "@/content/algebra1/units";
import type { RewardProgress } from "@/content/rewards";
import { getDb } from "@/db/client";
import { scheduleRows } from "@/db/queries/students";
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
import {
  ALGEBRA1_SESSION_ESTIMATE,
  DEFAULT_SESSION_TIME,
  firstScheduleDays,
  PRESET_SESSIONS,
  proposedDays,
} from "@/engine/pace";
import { calendarDay } from "@/parent/progress";
import { defaultRule } from "@/session/lock";
import { randomSeed } from "@/session/random-seed";

/** There is no sign-in yet, so the student pages act as this seeded student. */
export const DEMO_STUDENT_ID = "demo-student-maya";

/** The demo student's family: the parent pages and the admin panel act for it. */
export const DEMO_FAMILY_ID = "demo-family";

/** Session 1 of the seeded curriculum: two-step equations. */
export const S1_TEMPLATE_ID = "algebra-1-linear-equations-s1";

/**
 * The demo student's completion-reward rows (prototype, seeded). The 4-week streak starts at 3 of
 * 4, so the first scheduled session she finishes unlocks it. The course and Unit 1 start 5
 * sessions in, and every session she finishes adds one. She is not on Intensive pace.
 */
const DEMO_REWARDS: readonly RewardProgress[] = [
  { key: "course-on-time", current: 5, target: ALGEBRA1_SESSION_ESTIMATE },
  { key: "unit-on-time", current: 5, target: ALGEBRA1_UNITS[0].sessions },
  { key: "streak-4-weeks", current: 3, target: 4 },
  { key: "intensive-pace", current: 0, target: 4 },
];

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

/**
 * The curriculum rows and the demo family: a parent and Maya, grade 6, on track for May, with the
 * prototype's reward rows and mentor, and the demo clock off. Every statement is an upsert, so a
 * re-seed restores the profile and leaves session history and unlocked rewards alone.
 */
function profileStatements(db: LibSQLDatabase, now: Date): Statements {
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
    interests: ["sports" as const, "music" as const],
    favorites: {},
  };
  const course = { id: "algebra-1", title: "Algebra 1" };
  const [unit1] = ALGEBRA1_CONTENT;
  const [concept1] = unit1.concepts;
  const unit = {
    id: "algebra-1-linear-equations",
    courseId: course.id,
    title: unit1.title,
    position: unit1.number,
  };
  const session1 = {
    id: S1_TEMPLATE_ID,
    unitId: unit.id,
    title: concept1.title,
    position: 1,
    contentKey: concept1.key,
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
    db.insert(courses).values(course).onConflictDoUpdate({ target: courses.id, set: course }),
    db.insert(units).values(unit).onConflictDoUpdate({ target: units.id, set: unit }),
    db
      .insert(sessionTemplates)
      .values(session1)
      .onConflictDoUpdate({ target: sessionTemplates.id, set: session1 }),
    ...DEMO_REWARDS.map((row) =>
      db
        .insert(rewardProgress)
        .values({ studentId: maya.id, ...row })
        .onConflictDoUpdate({
          target: [rewardProgress.studentId, rewardProgress.key],
          set: { current: row.current, target: row.target },
        }),
    ),
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

/**
 * The state the demo starts from (milestone 12): today on Maya's schedule whatever its weekday,
 * since the demo day is a Friday and her days are not, the next two weeks of her session days, and
 * her phone rule switched on with no unlock running.
 */
function demoStateStatements(db: LibSQLDatabase, now: Date): Statements {
  const today = calendarDay(now);
  const days = new Set([today, ...firstScheduleDays(today, MAYA_PLAN.sessionDays)]);
  const schedule = [...days].map((day) => ({
    day,
    sessionTemplateId: S1_TEMPLATE_ID,
    seed: randomSeed(),
  }));
  const rule = { enabled: true, ...DEMO_LOCK_RULE, overrideUntil: null, updatedAt: now };
  return [
    db.insert(sessionLogs).values(scheduleRows(DEMO_STUDENT_ID, schedule)).onConflictDoNothing(),
    db
      .insert(lockRules)
      .values({ studentId: DEMO_STUDENT_ID, ...rule })
      .onConflictDoUpdate({ target: lockRules.studentId, set: rule }),
  ];
}

/**
 * Seeds the curriculum rows and the demo family (`profileStatements`). Safe to run again: it
 * restores the demo profile and leaves session history, the schedule and unlocked rewards alone.
 * The unit tests and the smoke server start from this.
 */
export async function seedDemo(now = new Date()): Promise<void> {
  const db = await getDb();
  await db.batch(profileStatements(db, now));
}

/**
 * Puts the database in exactly the state the demo starts from: every family and all history gone,
 * then the demo profile and the demo's starting state. `npm run db:seed -- --demo` and the admin
 * panel's "Reset demo" both run this. One transaction, so a page that loads during the reset sees
 * the old state or the new, never neither.
 */
export async function resetDemoData(now = new Date()): Promise<void> {
  const db = await getDb();
  const [first, ...rest] = DEMO_RESET_TABLES;
  await db.batch([
    db.delete(first),
    ...rest.map((table) => db.delete(table)),
    ...profileStatements(db, now),
    ...demoStateStatements(db, now),
  ]);
}
