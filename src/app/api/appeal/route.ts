import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { fail, json, readBody, str } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const a = await requireUser();
  if ("error" in a) return a.error;
  const p = a.user;

  const body = await readBody(req);
  const id = str(body.submission_id, 64);
  const note = str(body.note, 1000);
  if (note.length < 10) return fail("Explain why this should be reviewed again (at least 10 characters).");

  const supabase = db();
  const { data } = await supabase.from("submissions").select("*").eq("id", id).eq("participant_id", p.id).maybeSingle();
  const s = data as any;
  if (!s) return fail("Submission not found.", 404);
  if (s.status !== "Rejected" || s.appeal_status) return fail("This submission cannot be appealed.", 409);
  if (!s.reviewed_at || Date.now() - Date.parse(s.reviewed_at) > 48 * 60 * 60 * 1000) {
    return fail("The 48-hour appeal window has passed.", 409);
  }

  const { error } = await supabase
    .from("submissions")
    .update({ status: "Appealed", appeal_status: "Open", appeal_note: note })
    .eq("id", s.id);
  if (error) return fail("Could not send your appeal. Try again.", 500);

  await supabase.from("audit_log").insert({
    actor_id: p.id,
    action: "appeal_opened",
    target: `submission:${s.id}`,
    detail: { note },
  });
  return json({ ok: true, message: "Appeal sent. A reviewer will take another look." });
}
