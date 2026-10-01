import { describe, expect, it } from "vitest";
import { alertEmailHtml, masteryMessage, missedSessionMessage } from "@/parent/alerts";

describe("missed-session alert copy", () => {
  it("matches the pitch wording at one session behind", () => {
    expect(missedSessionMessage("Maya", 1, "2027-05-31")).toBe(
      "Maya missed today's Algebra session. She's 1 session behind her May target.",
    );
  });

  it("counts more than one session in the plural", () => {
    expect(missedSessionMessage("Maya", 2, "2027-05-31")).toBe(
      "Maya missed today's Algebra session. She's 2 sessions behind her May target.",
    );
  });

  it("says so when a make-up already covers the missed day", () => {
    expect(missedSessionMessage("Maya", 0, "2027-05-31")).toBe(
      "Maya missed today's Algebra session. She's still on track for her May target.",
    );
  });
});

describe("mastery alert copy", () => {
  it("names the concept mid-sentence and the exit score", () => {
    expect(masteryMessage("Maya", "Two-step equations", 3, 3)).toBe(
      "Maya mastered two-step equations, with 3 of 3 on the timed exit check.",
    );
  });
});

describe("alertEmailHtml", () => {
  const email = (studentName: string, message: string) =>
    alertEmailHtml({
      type: "missed",
      studentName,
      message,
      parentUrl: "https://klade.example/parent",
    });

  it("is a full document carrying the message, the subject and one link", () => {
    const html = email("Maya", missedSessionMessage("Maya", 1, "2027-05-31"));
    expect(html.startsWith("<!doctype html>")).toBe(true);
    expect(html).toContain("<title>Maya missed today&#39;s session</title>");
    expect(html).toContain(
      "Maya missed today&#39;s Algebra session. She&#39;s 1 session behind her May target.",
    );
    expect(html.match(/<a /g)).toHaveLength(1);
    expect(html).toContain('href="https://klade.example/parent"');
  });

  it("escapes every value, so stored text cannot add markup", () => {
    const html = email('<b>"Al"</b>', "<script>alert(1)</script>");
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("<b>");
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(html).toContain("&lt;b&gt;&quot;Al&quot;&lt;/b&gt;");
  });
});
