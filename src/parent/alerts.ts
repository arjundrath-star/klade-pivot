/** Alert copy and the alert email. Parent-facing text: see the wording rule in tests/unit/parent. */
import { inSentence } from "@/content/title";
import { sessionCount, targetMonth } from "@/parent/progress";

export const ALERT_TYPES = ["missed", "behind", "milestone"] as const;

type AlertType = (typeof ALERT_TYPES)[number];

/**
 * The same-day missed-session alert. With one session behind it reads exactly as the pitch does:
 * "Maya missed today's Algebra session. She's 1 session behind her May target."
 */
export function missedSessionMessage(name: string, behind: number, targetDate: string): string {
  const month = targetMonth(targetDate);
  const standing =
    behind === 0
      ? `She's still on track for her ${month} target.`
      : `She's ${sessionCount(behind)} behind her ${month} target.`;
  return `${name} missed today's Algebra session. ${standing}`;
}

/** The alert when a session ends in mastery. */
export function masteryMessage(
  name: string,
  concept: string,
  exitCorrect: number,
  exitTotal: number,
): string {
  return `${name} mastered ${inSentence(concept)}, with ${exitCorrect} of ${exitTotal} on the timed exit check.`;
}

function alertSubject(type: AlertType, name: string): string {
  switch (type) {
    case "missed":
      return `${name} missed today's session`;
    case "behind":
      return `${name} is behind schedule`;
    case "milestone":
      return `${name} mastered a concept`;
  }
}

const HTML_ESCAPES: Readonly<Record<string, string>> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (char) => HTML_ESCAPES[char]);
}

interface AlertEmail {
  type: AlertType;
  studentName: string;
  message: string;
  /** Absolute URL of the parent view, for the email's one link. */
  parentUrl: string;
}

/**
 * The alert email as a complete HTML document: table layout and inline styles, the way email
 * clients need it. Every value is escaped.
 */
export function alertEmailHtml({ type, studentName, message, parentUrl }: AlertEmail): string {
  const subject = escapeHtml(alertSubject(type, studentName));
  const name = escapeHtml(studentName);
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Helvetica,Arial,sans-serif;color:#18181b;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 16px;">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:8px;padding:32px;">
<tr><td style="font-size:13px;font-weight:bold;letter-spacing:0.08em;text-transform:uppercase;color:#52525b;padding-bottom:16px;">Klade · Algebra 1</td></tr>
<tr><td style="font-size:20px;line-height:1.5;padding-bottom:24px;">${escapeHtml(message)}</td></tr>
<tr><td style="padding-bottom:24px;"><a href="${escapeHtml(parentUrl)}" style="display:inline-block;background:#18181b;color:#ffffff;text-decoration:none;font-weight:bold;padding:12px 20px;border-radius:6px;">See ${name}'s progress</a></td></tr>
<tr><td style="font-size:13px;line-height:1.5;color:#52525b;">You get this email because you set up Klade for ${name}.</td></tr>
</table>
</td></tr>
</table>
</body>
</html>
`;
}
