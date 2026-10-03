import { z } from "zod";
import { APP_URL } from "@/config/app-url";
import { familyAlert } from "@/db/queries/alerts";
import { gatedFamily } from "@/gate/server";
import { STATIC_HTML_HEADERS } from "@/http/static-html";
import { alertEmailHtml } from "@/parent/alerts";

/** The alert email exactly as it would be sent. Nothing is sent; this is the preview. */
export async function GET(request: Request, ctx: RouteContext<"/parent/alerts/[id]/preview">) {
  const { familyId } = await gatedFamily("/parent");
  const id = z.uuid().safeParse((await ctx.params).id);
  const alert = id.success ? await familyAlert(id.data, familyId) : undefined;
  if (!alert) return new Response("Not found", { status: 404 });

  const html = alertEmailHtml({
    type: alert.type,
    studentName: alert.studentName,
    message: alert.message,
    parentUrl: new URL("/parent", APP_URL ?? request.url).href,
  });
  // Email HTML carries inline styles and nothing else.
  return new Response(html, { headers: STATIC_HTML_HEADERS });
}
