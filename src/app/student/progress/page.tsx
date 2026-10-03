import type { Metadata } from "next";
import { connection } from "next/server";
import { BadgeShelf } from "../badge-shelf";
import { LevelStat, StatStrip, StreakStat } from "../stats";
import { StudentShell } from "../student-shell";
import { adminControls } from "@/admin/controls";
import { PageHeader } from "@/components/ui/page-header";
import { rewardBoard } from "@/content/rewards";
import { rewardRows } from "@/db/queries/reward-progress";
import { studentEarnings } from "@/db/queries/rewards";
import { findTodaySession } from "@/db/queries/sessions";
import { RewardsPanel } from "@/rewards/rewards-panel";
import { studentOnPage } from "@/session/current-student";
import { studentStanding } from "@/session/pace";

export const metadata: Metadata = { title: "Progress" };

export default async function ProgressPage() {
  await connection();
  const { id: studentId, student } = await studentOnPage("/student/progress");
  const [controls, today, earnings, standing, rows] = await Promise.all([
    adminControls(),
    findTodaySession(studentId),
    studentEarnings(studentId),
    studentStanding(studentId, new Date()),
    rewardRows(studentId),
  ]);
  const rewards = rewardBoard(rows, standing);

  return (
    <StudentShell
      active="/student/progress"
      student={student}
      standing={{
        xp: earnings.xp,
        mastered: earnings.mastered,
        streak: standing.streak.count,
      }}
      controls={controls}
    >
      {() => (
        <>
          <PageHeader title="Progress">
            <p>
              XP and your level, the badges you have earned, and the rewards you are working toward.
            </p>
          </PageHeader>
          <StatStrip label="Your standing">
            <LevelStat xp={earnings.xp} mastered={earnings.mastered} />
            <StreakStat streak={standing.streak} />
          </StatStrip>
          <div className="grid gap-5 lg:grid-cols-2">
            <BadgeShelf
              earned={earnings.badges}
              currentKey={today.kind === "complete" ? null : today.contentKey}
            />
            {rewards.length > 0 && (
              <RewardsPanel
                entries={rewards}
                behind={standing.behind}
                viewer={{ kind: "student" }}
              />
            )}
          </div>
        </>
      )}
    </StudentShell>
  );
}
