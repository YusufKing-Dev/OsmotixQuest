import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { fail, json, readBody, str } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const a = await requireAdmin();
  if ("error" in a) return a.error;

  const body = await readBody(req);
  const ids = Array.isArray(body.ids) ? body.ids.filter((x): x is string => typeof x === "string").slice(0, 200) : [];
  const action = body.action;
  const reason = str(body.reason, 500);
  if (!ids.length) return fail("Select at least one submission.");
  if (action !== "approve" && action !== "reject") return fail("Unknown action.");
  if (action === "reject" && reason.length < 3) return fail("Add a rejection reason so the participant knows what to fix.");

  const supabase = db();
  const { data } = await supabase
    .from("submissions")
    .select("id, status, appeal_status, quests(points)")
    .in("id", ids);
  const rows = (data ?? []) as any[];

  const stamp = new Date().toISOString();
  let changed = 0;
  for (const s of rows) {
    const quest = Array.isArray(s.quests) ? s.quests[0] : s.quests;
    const wasAppeal = s.status === "Appealed" || s.appeal_status === "Open";
    const update: Record<string, unknown> = {
      reviewer_id: null,
      reviewed_at: stamp,
      appeal_status: wasAppeal ? "Closed" : s.appeal_status,
    };
    if (action === "approve") {
      if (s.status === "Approved") continue;
      Object.assign(update, { status: "Approved", points_awarded: quest?.points ?? 0, rejection_reason: null });
    } else {
      Object.assign(update, { status: "Rejected", points_awarded: 0, rejection_reason: reason });
    }
    const { error } = await supabase.from("submissions").update(update).eq("id", s.id);
    if (error) continue;
    changed++;
    await supabase.from("audit_log").insert({
      actor_id: null,
      action: action === "approve" ? "approve" : "reject",
      target: `submission:${s.id}`,
      detail: { reason: action === "reject" ? reason : null, appeal: wasAppeal },
    });
  }
  return json({ ok: true, changed });
}
