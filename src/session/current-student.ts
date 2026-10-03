import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { getStudent } from "@/db/queries/students";
import { gateUrl } from "@/gate/paths";
import { signedInFamily, type GatedFamily } from "@/gate/server";
import { httpOnlyCookie, SCHOOL_YEAR_SECONDS } from "@/session/cookies";
import { STUDENT_COOKIE, StudentId, studentIdOf } from "@/session/student-cookie";
import { demoUrl } from "@/visitor/paths";

/**
 * Sign-in is not built yet. Who a browser is comes from two cookies: the student cookie
 * (`STUDENT_COOKIE`), which onboarding sets to the new student's id and the proxy sets for a
 * browser that arrives with nothing, and the gate cookie, which makes a browser the founder's.
 * Sign-in replaces this one module.
 */

type Student = NonNullable<Awaited<ReturnType<typeof getStudent>>>;

interface Browser {
  /** The student this browser acts as on the student's side. */
  studentId: string;
  /** That student's row; undefined once it is gone (a swept copy, or a reset onboarding). */
  student: Student | undefined;
  /** The family the gate signed this browser into, or null. */
  signedIn: GatedFamily | null;
}

/**
 * Who this browser is, decided once per request from its cookies and the student row: its
 * cookie's student, else the demo student for a browser signed in at the gate, else nobody
 * (null). The founder's browser never acts as a visitor's copy, or as a student who is gone,
 * whatever cookie it picked up while signed out: signed in, such a cookie reads as none.
 */
const browser = cache(async (): Promise<Browser | null> => {
  const [cookieId, signedIn] = await Promise.all([
    (async () => studentIdOf((await cookies()).get(STUDENT_COOKIE)?.value))(),
    signedInFamily(),
  ]);
  const [student, demoStudent] = await Promise.all([
    cookieId ? getStudent(cookieId) : undefined,
    signedIn ? getStudent(signedIn.studentId) : undefined,
  ]);
  if (signedIn && (!student || student.visitor)) {
    return { studentId: signedIn.studentId, student: demoStudent, signedIn };
  }
  return cookieId ? { studentId: cookieId, student, signedIn } : null;
});

/** The student this browser acts as, for the session actions and the API routes; nobody is undefined. */
export async function currentStudentId(): Promise<string | undefined> {
  return (await browser())?.studentId;
}

/** That student's row, for an action that needs more than the id; undefined when there is none. */
export async function currentStudent() {
  return (await browser())?.student;
}

/**
 * The student a student page renders for, with the row the shell needs. A browser that is nobody,
 * or whose cookie's student is gone (a visitor's copy the sweep removed), is sent to /demo for a
 * copy of the demo persona and comes back to `path`. A browser signed in at the gate never is: it
 * acts as the demo student, and shows the empty state only when she is not seeded.
 */
export async function studentOnPage(path: string) {
  const who = await browser();
  if (!who || (!who.student && !who.signedIn)) redirect(demoUrl(path));
  return { id: who.studentId, student: who.student };
}

/** The family a parent page or action acts for, and whether the browser is the founder's. */
export interface ParentViewer extends GatedFamily {
  /** Signed in at the gate: the demo family, with the gated pages open to it. */
  signedIn: boolean;
}

/**
 * The family this browser's parent pages act for: the demo family once signed in at the gate,
 * whatever its student cookie says, else the family of its cookie's student when that is a
 * visitor's copy (milestone 20: the one family whose parent pages open without the gate), else
 * null. Every parent query scopes by these ids, so a visitor sees their copy and nothing else.
 */
export async function parentViewer(): Promise<ParentViewer | null> {
  const who = await browser();
  if (who?.signedIn) return { ...who.signedIn, signedIn: true };
  if (!who?.student?.visitor) return null;
  return { familyId: who.student.familyId, studentId: who.student.id, signedIn: false };
}

/**
 * `parentViewer` for the parent pages and actions, which cannot go on without a family: a browser
 * that is nobody is sent to /demo for its copy, and a browser that onboarded a family to the
 * gate, as before this milestone, each to come back to `path`.
 */
export async function parentOnPage(path: string): Promise<ParentViewer> {
  const viewer = await parentViewer();
  if (viewer) return viewer;
  const who = await browser();
  redirect(who?.student ? gateUrl(path) : demoUrl(path));
}

/** Makes this browser act as `studentId` from the next request on. Server actions only. */
export async function rememberStudent(studentId: string): Promise<void> {
  (await cookies()).set(
    STUDENT_COOKIE,
    StudentId.parse(studentId),
    httpOnlyCookie(SCHOOL_YEAR_SECONDS),
  );
}

/** Makes this browser act as the demo student again. Server actions only. */
export async function forgetStudent(): Promise<void> {
  (await cookies()).delete(STUDENT_COOKIE);
}
