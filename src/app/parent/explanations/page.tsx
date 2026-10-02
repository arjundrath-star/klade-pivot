import type { Metadata } from "next";
import { connection } from "next/server";
import { ParentShell } from "../parent-shell";
import {
  CRITERIA,
  CRITERION_LABELS,
  MAX_TOTAL_SCORE,
  totalScore,
  type RubricScores,
} from "@/coach/rubric";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { coachTurnsFor } from "@/db/queries/coach";
import { explainIntegrity, latestExplanation } from "@/db/queries/parent";
import { getStudent } from "@/db/queries/students";
import { gatedFamily } from "@/gate/server";
import { plural } from "@/parent/progress";

export const metadata: Metadata = { title: "Explanations" };

function rubricLine(verdict: "pass" | "fail", scores: RubricScores): string {
  const parts = CRITERIA.map((c) => `${CRITERION_LABELS[c].toLowerCase()} ${scores[c]}`);
  const total = `${totalScore(scores)} of ${MAX_TOTAL_SCORE}`;
  return `${verdict === "pass" ? "Passed" : "Did not pass"} the rubric, ${total}: ${parts.join(", ")}.`;
}

/** The latest decided explanation and the coach conversation from the same session. */
async function latestWithTranscript(studentId: string) {
  const explanation = await latestExplanation(studentId);
  const transcript = explanation ? await coachTurnsFor(explanation.sessionLogId) : [];
  return { explanation, transcript };
}

export default async function ExplanationsPage() {
  await connection();
  const { studentId } = await gatedFamily("/parent/explanations");
  const [student, { explanation, transcript }, integrity] = await Promise.all([
    getStudent(studentId),
    latestWithTranscript(studentId),
    explainIntegrity(studentId),
  ]);

  return (
    <ParentShell active="/parent/explanations" student={student}>
      {({ name }) => (
        <section aria-labelledby="explain-heading" className="flex max-w-3xl flex-col gap-6">
          <PageHeader id="explain-heading" title="Explanations">
            <p>
              What {name} can explain. After each session, {name} explains why every step works, by
              voice or typing, and a rubric grades it. The latest explanation is here word for word.
            </p>
          </PageHeader>
          <Card tone="course" className="flex flex-col gap-4">
            {explanation ? (
              <>
                <p className="font-display text-xl font-semibold">{explanation.concept}</p>
                {explanation.source === "override" ? (
                  <p className="flex flex-wrap items-center gap-2">
                    <Badge tone="today">override</Badge>
                    No explanation was graded in this session. An admin passed explain-back by hand.
                  </p>
                ) : (
                  <>
                    <blockquote className="border-l-[3px] border-course-deep pl-4 text-lg leading-relaxed whitespace-pre-line">
                      {explanation.text}
                    </blockquote>
                    <p className="font-medium">{rubricLine(explanation.verdict, explanation)}</p>
                    <p className="text-ink-soft">
                      Feedback {name} saw: {explanation.feedback}
                    </p>
                  </>
                )}
                <details className="flex flex-col gap-2 border-t border-course/40 pt-3">
                  <summary className="focus-ring cursor-pointer rounded-sm font-medium">
                    Coach conversation in this session ({plural(transcript.length, "hint")})
                  </summary>
                  {transcript.length === 0 ? (
                    <p className="mt-2 text-ink-soft">{name} did not ask the coach for help.</p>
                  ) : (
                    <ol className="mt-3 flex flex-col gap-3">
                      {transcript.map((turn) => (
                        <li key={turn.id} className="flex flex-col gap-1">
                          <p className="text-sm text-ink-soft">
                            Problem {turn.problemIndex + 1}, hint {turn.level}
                          </p>
                          <p>
                            <span className="font-medium">{name}:</span> {turn.studentText}
                          </p>
                          <p>
                            <span className="font-medium">Coach:</span> {turn.coachText}
                          </p>
                        </li>
                      ))}
                    </ol>
                  )}
                </details>
              </>
            ) : (
              <p className="text-ink-soft">
                Nothing yet. {name}&apos;s explanation shows here after the first finished session.
              </p>
            )}
            {integrity.graded > 0 && (
              <p className="text-sm text-ink-soft">
                Across {plural(integrity.graded, "graded explanation")}: {integrity.pasted} with
                pasted text, {integrity.fast} typed faster than a person types.
              </p>
            )}
          </Card>
        </section>
      )}
    </ParentShell>
  );
}
