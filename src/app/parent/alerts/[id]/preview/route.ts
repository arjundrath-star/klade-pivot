import { z } from "zod";
import { DEMO_FAMILY_ID } from "@/db/demo";
import { familyAlert } from "@/db/queries/alerts";
import { alertEmailHtml } from "@/parent/alerts";

/** The alert email exactly as it would be sent. Nothing is sent; this is the preview. */
export async function GET(request: Request, ctx: RouteContext<"/parent/alerts/[id]/preview">) {
  const id = z.uuid().safeParse((await ctx.params).id);
  // Sign-in is not built yet, so the parent pages act for the demo family.
  const alert = id.success ? await familyAlert(id.data, DEMO_FAMILY_ID) : undefined;
  if (!alert) return new Response("Not found", { status: 404 });

  const html = alertEmailHtml({
    type: alert.type,
    studentName: alert.studentName,
    message: alert.message,
    parentUrl: new URL("/parent", request.url).href,
  });
  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      // Email HTML carries inline styles and nothing else.
      "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'",
      "Cache-Control": "no-store",
    },
  });
}
